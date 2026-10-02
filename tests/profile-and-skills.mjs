import assert from 'node:assert/strict'
import { createServer } from 'vite'

let response
let calls = []
const query = new Proxy({}, { get(_target, method) {
  if (method === 'then') return (resolve) => resolve(response)
  return (...args) => { calls.push([method, ...args]); return query }
} })
globalThis.__profileTestClient = { from(table) { calls.push(['from', table]); return query } }
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  plugins: [{
    name: 'mock-supabase-for-tests',
    enforce: 'pre',
    resolveId(id) { if (/\/supabaseClient(?:\.js)?$/.test(id)) return '\0test-client' },
    load(id) { if (id === '\0test-client') return 'export const supabase = globalThis.__profileTestClient' },
  }],
})
try {
  const { containsContactDetails } = await server.ssrLoadModule('/src/utils/publicTextPrivacy.js')
  for (const text of ['a@example.com', 'a [at] example [dot] com', '(210) 555-0199', '+44 20 7946 0958', '123 Main Street', 'PO Box 123', '１２３ Main Street', '#210 #555 #0199']) assert.equal(containsContactDetails(text), true, text)
  for (const text of ['San Antonio, TX', 'Learn Python 3.12', 'Bake at 350 degrees for 20 minutes', '7 years of experience', 'Main Street photography']) assert.equal(containsContactDetails(text), false, text)
  const { prepareProfile, validateProfile } = await server.ssrLoadModule('/src/utils/profileUtils.js')
  const { getProfile, saveProfile } = await server.ssrLoadModule('/src/services/profileService.js')
  const { getSkills, addSkill, updateSkill, deleteSkill } = await server.ssrLoadModule('/src/services/skillService.js')
  const { prepareSkillForSave, validateSkill, capitalizeWords, capitalizeSentences, formatTags, parseTags, formatSkillFromDatabase } = await server.ssrLoadModule('/src/utils/skillUtils.js')
  assert.equal(capitalizeWords('beginner guitar with HTML'), 'Beginner Guitar With HTML')
  assert.equal(capitalizeWords("don't change iOS"), "Don't Change iOS")
  assert.equal(capitalizeSentences('  hello! want to learn? try HTML.\nlet’s share.'), '  Hello! Want to learn? Try HTML.\nLet’s share.')
  assert.equal(capitalizeSentences('visit example.com for help. use React.'), 'Visit example.com for help. Use React.')
  assert.equal(formatTags('guitar, #music, ##Guitar beginner'), '#guitar #music #beginner')
  assert.deepEqual(parseTags('#guitar #music'), ['guitar', 'music'])
  assert.equal(formatTags(['guitar', '#music']), '#guitar #music')
  assert.equal(formatTags(formatTags('guitar,music')), '#guitar #music')
  assert.equal(prepareProfile({ displayName: 'A', username: 'abc', bio: 'hello. welcome!', location: 'san antonio, tx' }).bio, 'Hello. Welcome!')
  const profile = prepareProfile({ displayName: '  Mallory  ', username: ' mallory.s ', bio: ' Hello! ', location: 'san antonio, tx' })
  assert.equal(profile.displayName, 'Mallory')
  assert.equal(profile.location, 'San Antonio, TX')
  assert.equal(validateProfile(profile), '')
  assert.match(validateProfile({ ...profile, location: '123 Main St, TX' }), /city/)
  assert.match(validateProfile({ ...profile, username: 'has spaces' }), /username/)
  assert.match(validateProfile({ ...profile, bio: 'x'.repeat(501) }), /bio/)

  response = { data: { id: 'owner', display_name: 'Mallory' }, error: null }
  calls = []
  await assert.rejects(saveProfile('owner', { ...profile, bio: 'Call 210-555-0199' }), /Remove email/)
  assert.equal(calls.length, 0)
  const saved = await saveProfile('owner', { ...profile, is_admin: true, credits: 999 })
  assert.equal(saved.display_name, 'Mallory')
  assert.deepEqual(calls.find(([method]) => method === 'update')[1], {
    display_name: 'Mallory', username: 'mallory.s', bio: 'Hello!', location: 'San Antonio, TX',
  })
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'id', 'owner'])
  assert.equal(calls.at(-1)[0], 'single')
  calls = []
  await getProfile('member')
  assert.equal(calls.find(([method]) => method === 'select')[1], 'id, display_name, username, bio, location')
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'id', 'member'])
  response = { data: null, error: { code: '23505' } }
  await assert.rejects(saveProfile('owner', profile), error => error.code === '23505')

  const skill = prepareSkillForSave({ title: ' Guitar ', description: ' Basics ', category: 'Music', listingType: 'Teacher', tags: '', experienceLevel: 'Beginner', format: 'Online', language: 'English', location: '' })
  assert.equal(validateSkill(skill), '')
  assert.match(validateSkill({ ...skill, location: '123 Main St, TX' }), /City/)
  response = { data: { id: 'skill' }, error: null }
  calls = []
  await assert.rejects(addSkill('owner', { ...skill, title: 'a@example.com' }), /Remove email/)
  await assert.rejects(updateSkill('owner', 'skill', { ...skill, tags: '#123 #Main #Street' }), /Remove email/)
  assert.equal(calls.length, 0)
  await updateSkill('owner', 'skill', skill)
  assert.deepEqual(calls.filter(([method]) => method === 'eq'), [['eq', 'id', 'skill'], ['eq', 'user_id', 'owner']])
  const tagged = { ...skill, tags: '#guitar #music' }
  calls = []
  await addSkill('owner', tagged)
  assert.deepEqual(calls.find(([method]) => method === 'insert')[1].tags, ['guitar', 'music'])
  calls = []
  await updateSkill('owner', 'skill', tagged)
  assert.deepEqual(calls.find(([method]) => method === 'update')[1].tags, ['guitar', 'music'])
  assert.equal(formatSkillFromDatabase({ tags: ['guitar', 'music'], title: 'guitar lessons', description: 'learn chords. play songs.' }).tags, '#guitar #music')
  calls = []
  response = { data: [], error: null }
  await getSkills('owner')
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'user_id', 'owner'])
  await assert.rejects(deleteSkill('owner', 'other-skill'), /not removed/)
  response = { data: [{ id: 'skill' }], error: null }
  await deleteSkill('owner', 'skill')
  console.log('Passed: profile normalization/validation, public field selection, database saves/errors, skill validation, ownership filters, and zero-row delete handling.')
} finally {
  await server.close()
  delete globalThis.__profileTestClient
}
