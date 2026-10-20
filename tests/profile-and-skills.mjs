import assert from 'node:assert/strict'
import { createServer } from 'vite'

let response
let calls = []
let queuedResponses = []
const query = new Proxy({}, { get(_target, method) {
  if (method === 'then') return (resolve) => resolve(queuedResponses.length ? queuedResponses.shift() : response)
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
  for (const text of ['call2105550123now', 'abc210-555-0123xyz', 'phone1234567890123456end', 'abc123 Main Streetxyz', '123MainStreet', 'abc123MainStreetxyz', '123 Main St', 'mailPOBox123now']) assert.equal(containsContactDetails(text), true, text)
  for (const text of ['CS101 programming', '3D printing', 'Python 3 basics', '123 Mainstream concepts']) assert.equal(containsContactDetails(text), false, text)
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
  const profile = prepareProfile({ displayName: '  Test Member  ', username: ' test.member ', bio: ' Hello! ', location: 'san antonio, tx' })
  assert.equal(profile.displayName, 'Test Member')
  assert.equal(profile.location, 'San Antonio, TX')
  assert.equal(validateProfile(profile), '')
  assert.match(validateProfile({ ...profile, location: '123 Main St, TX' }), /city/)
  assert.match(validateProfile({ ...profile, username: 'has spaces' }), /username/)
  assert.match(validateProfile({ ...profile, bio: 'x'.repeat(501) }), /bio/)

  response = { data: { id: 'owner', display_name: 'Test Member' }, error: null }
  calls = []
  await assert.rejects(saveProfile('owner', { ...profile, bio: 'Call 210-555-0199' }), /Remove email/)
  await assert.rejects(saveProfile('owner', { ...profile, bio: 'call2105550123now' }), /Remove email/)
  await assert.rejects(saveProfile('owner', { ...profile, bio: 'abc123MainStreetxyz' }), /Remove email/)
  assert.equal(calls.length, 0)
  const saved = await saveProfile('owner', { ...profile, id: 'other-user', is_admin: true, credits_balance: 999, email: 'private@example.com', verification_video_link: 'private-video' })
  assert.equal(saved.display_name, 'Test Member')
  assert.deepEqual(calls.find(([method]) => method === 'update')[1], {
    display_name: 'Test Member', username: 'test.member', bio: 'Hello!', location: 'San Antonio, TX', avatar_id: null,
  })
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'id', 'owner'])
  assert.equal(calls.at(-1)[0], 'single')
  calls = []
  await getProfile('member')
  assert.equal(calls.find(([method]) => method === 'select')[1], 'id, display_name, username, bio, location, avatar_id')
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'id', 'member'])
  calls = []
  await saveProfile('owner', { ...profile, avatarId: 'hedgehog' })
  assert.equal(calls.find(([method]) => method === 'update')[1].avatar_id, 'hedgehog')
  calls = []
  await assert.rejects(saveProfile('owner', { ...profile, avatarId: 'unlisted' }), /available options/)
  assert.equal(calls.length, 0)
  assert.match(validateProfile({ ...profile, avatarId: 'unlisted' }), /available options/)
  response = { data: null, error: { code: '42703', message: 'column avatar_id does not exist' } }
  await assert.rejects(saveProfile('owner', { ...profile, avatarId: 'hedgehog' }), error => error.code === 'AVATAR_NOT_ENABLED')
  response = { data: null, error: { code: '23505' } }
  await assert.rejects(saveProfile('owner', profile), error => error.code === '23505')
  response = { data: null, error: { code: 'PGRST116', message: 'No rows returned' } }
  await assert.rejects(saveProfile('owner', profile), error => error.code === 'PGRST116')

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
  const protectedSkill = { ...tagged, id: 'other-skill', user_id: 'other-user', credits_balance: 999 }
  calls = []
  await addSkill('owner', protectedSkill)
  const insertedSkill = calls.find(([method]) => method === 'insert')[1]
  assert.equal(insertedSkill.user_id, 'owner')
  assert.equal(Object.hasOwn(insertedSkill, 'id'), false)
  assert.equal(Object.hasOwn(insertedSkill, 'credits_balance'), false)
  calls = []
  await updateSkill('owner', 'skill', protectedSkill)
  const updatedSkill = calls.find(([method]) => method === 'update')[1]
  for (const field of ['id', 'user_id', 'credits_balance']) assert.equal(Object.hasOwn(updatedSkill, field), false)
  assert.deepEqual(calls.filter(([method]) => method === 'eq'), [['eq', 'id', 'skill'], ['eq', 'user_id', 'owner']])
  response = { data: null, error: { code: 'PGRST116', message: 'No rows returned' } }
  await assert.rejects(updateSkill('owner', 'other-skill', tagged), error => error.code === 'PGRST116')
  assert.equal(formatSkillFromDatabase({ tags: ['guitar', 'music'], title: 'guitar lessons', description: 'learn chords. play songs.' }).tags, '#guitar #music')
  calls = []
  response = { data: [], error: null }
  await getSkills('owner')
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'user_id', 'owner'])
  calls = []
  await assert.rejects(deleteSkill('owner', 'other-skill'), /not removed/)
  assert.deepEqual(calls.filter(([method]) => method === 'eq'), [['eq', 'id', 'other-skill'], ['eq', 'user_id', 'owner']])
  response = { data: null, error: { code: '42501', message: 'Permission denied' } }
  await assert.rejects(deleteSkill('owner', 'skill'), error => error.code === '42501')
  response = { data: [{ id: 'skill' }], error: null }
  await deleteSkill('owner', 'skill')
  console.log('Passed: profile normalization/validation, public field selection, database saves/errors, skill validation, ownership filters, and zero-row delete handling.')

  // Supplemental regression cases use only the injected client above, never a live database.
  async function check(id, test) {
    calls = []
    queuedResponses = []
    await test()
    assert.equal(queuedResponses.length, 0, `${id}: all expected responses consumed`)
    console.log(`PASS ${id}`)
  }
  const legacyFields = 'id, display_name, username, bio, location'
  const legacyProfile = { id: 'owner', display_name: 'Member', username: 'member', bio: '', location: 'San Antonio, TX' }
  for (const code of ['42703', 'PGRST204']) {
    const missingAvatar = { code, message: 'column avatar_id does not exist' }
    await check(`PRF-COMPAT-READ-${code}`, async () => {
      queuedResponses = [{ data: null, error: missingAvatar }, { data: legacyProfile, error: null }]
      assert.deepEqual(await getProfile('owner'), legacyProfile)
      assert.deepEqual(calls.filter(([method]) => method === 'select').map(([, fields]) => fields), [`${legacyFields}, avatar_id`, legacyFields])
      assert.deepEqual(calls.filter(([method]) => method === 'eq'), [['eq', 'id', 'owner'], ['eq', 'id', 'owner']])
    })
    await check(`PRF-COMPAT-SAVE-${code}`, async () => {
      queuedResponses = [{ data: null, error: missingAvatar }, { data: legacyProfile, error: null }]
      assert.deepEqual(await saveProfile('owner', { ...profile, avatarId: null }), legacyProfile)
      const { avatar_id: _avatar, ...expected } = calls.find(([method]) => method === 'update')[1]
      assert.equal(_avatar, null)
      assert.deepEqual(calls.filter(([method]) => method === 'update')[1][1], expected)
      assert.deepEqual(calls.filter(([method]) => method === 'eq'), [['eq', 'id', 'owner'], ['eq', 'id', 'owner']])
      assert.equal(calls.filter(([method]) => method === 'select')[1][1], legacyFields)
    })
  }
  await check('PRF-COMPAT-FAILURE', async () => {
    const failure = { code: '42501', message: 'Permission denied' }
    for (const operation of [() => getProfile('owner'), () => saveProfile('owner', profile)]) {
      calls = []
      queuedResponses = [
        { data: null, error: { code: '42703', message: 'column avatar_id does not exist' } },
        { data: null, error: failure },
      ]
      await assert.rejects(operation(), error => error === failure)
      assert.equal(calls.filter(([method]) => method === 'from').length, 2)
    }
  })
  await check('PRF-ERROR-NO-FALLBACK', async () => {
    for (const error of [
      { code: '42501', message: 'Permission denied' },
      { code: '42703', message: 'column username does not exist' },
    ]) {
      for (const operation of [() => getProfile('owner'), () => saveProfile('owner', profile)]) {
        calls = []
        response = { data: null, error }
        await assert.rejects(operation(), failure => failure === error)
        assert.equal(calls.filter(([method]) => method === 'from').length, 1)
      }
    }
  })
  await check('PRF-BOUNDARY-REQUIRED', async () => {
    for (const field of ['displayName', 'username', 'location']) {
      for (const value of ['', '   ']) {
        const candidate = prepareProfile({ ...profile, [field]: value })
        assert.match(validateProfile(candidate), /Enter a display name/, field)
      }
    }
    assert.equal(validateProfile({ ...profile, bio: '' }), '', 'bio is optional')
    assert.equal(calls.length, 0)
  })
  await check('PRF-BOUNDARY-LENGTH', async () => {
    for (const length of [2, 3, 30, 31]) {
      const result = validateProfile({ ...profile, username: 'a'.repeat(length) })
      if (length === 2 || length === 31) assert.match(result, /3–30/)
      else assert.equal(result, '')
    }
    for (const [field, limit] of [['displayName', 80], ['bio', 500]]) {
      for (const length of [limit - 1, limit, limit + 1]) {
        const result = validateProfile({ ...profile, [field]: 'a'.repeat(length) })
        if (length > limit) assert.match(result, /under 81.*under 501/)
        else assert.equal(result, '')
      }
    }
    assert.equal(calls.length, 0)
  })
  await check('SKL-BOUNDARY-REQUIRED', async () => {
    for (const field of ['title', 'description', 'category', 'experienceLevel', 'listingType', 'format', 'language']) {
      for (const value of ['', '   ']) {
        const candidate = prepareSkillForSave({ ...skill, [field]: value })
        assert.match(validateSkill(candidate), /required/, field)
      }
    }
    assert.equal(validateSkill({ ...skill, tags: '', location: '' }), '', 'tags and location are optional')
    assert.equal(calls.length, 0)
  })
  await check('SKL-ERROR-PROPAGATION', async () => {
    for (const operation of [() => getSkills('owner'), () => addSkill('owner', skill), () => updateSkill('owner', 'skill', skill)]) {
      calls = []
      const error = { code: '42501', message: 'Permission denied' }
      response = { data: null, error }
      await assert.rejects(operation(), failure => failure === error)
      assert.equal(calls.filter(([method]) => method === 'from').length, 1)
    }
  })
  console.log('Passed: 10 supplemental regression cases. Supabase responses were simulated; no live database authorization was tested.')
} finally {
  await server.close()
  delete globalThis.__profileTestClient
}
