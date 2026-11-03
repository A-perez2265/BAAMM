import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

// This runner cannot target hosted Supabase. Fixtures and history remain local.
const runtime = JSON.parse(await readFile('.local-supabase/runtime.json', 'utf8'))
const url = 'http://127.0.0.1:54321'
assert.equal(runtime.API_URL, url)
assert.equal(new URL(runtime.DB_URL).hostname, '127.0.0.1')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const client = () => createClient(url, runtime.ANON_KEY, options)
const maintenance = createClient(url, runtime.SERVICE_ROLE_KEY, options)
const directory = '.local-deliverables/supabase-tests'
await mkdir(directory, { recursive: true })
const startedAt = new Date().toISOString()
const cases = []
const accounts = []
let setupError

function unwrap({ data, error }) { if (error) throw error; return data }
const suffix = () => [...randomBytes(16)].map(value => String.fromCharCode(97 + value % 26)).join('')
async function account(label, admin = false) {
  const name = `test_${suffix()}`
  const email = `${name}@example.test`
  const password = `Local!A7${randomBytes(24).toString('base64url')}`
  const api = client()
  const user = unwrap(await api.auth.signUp({ email, password, options: { data: { username: name, display_name: `Test ${label}` } } })).user
  assert.ok(user?.id)
  const fixture = { id: user.id, api, email, password, label }
  accounts.push(fixture)
  if (admin) unwrap(await maintenance.auth.admin.updateUserById(user.id, { app_metadata: { is_admin: true } }))
  unwrap(await api.auth.signInWithPassword({ email, password }))
  return fixture
}
async function check(id, expected, test) {
  try {
    const actual = await test()
    cases.push({ id, expected, actual: actual || 'All assertions passed', status: 'PASS' })
    console.log(`PASS ${id}: ${actual || expected}`)
  } catch (error) {
    cases.push({ id, expected, actual: error.message, status: 'FAIL' })
    throw error
  }
}
async function balance(user) {
  return unwrap(await user.api.from('profiles').select('credits_balance').eq('id', user.id).single()).credits_balance
}
async function status(id) {
  return unwrap(await maintenance.from('exchanges').select('status').eq('id', id).single()).status
}
async function ready(learner, teacher, skill, complete = true) {
  const exchange = unwrap(await learner.api.from('exchanges').insert({ learner_id: learner.id, teacher_id: teacher.id, skill_id: skill, message: 'Please teach this practice lesson.', status: 'pending' }).select('id').single())
  unwrap(await teacher.api.from('exchanges').update({ status: 'accepted' }).eq('id', exchange.id).select('id').single())
  if (complete) unwrap(await teacher.api.from('exchanges').update({ status: 'session_completed' }).eq('id', exchange.id).select('id').single())
  return exchange.id
}
async function confirm(user, id) {
  return user.api.rpc('confirm_skill_exchange', { p_exchange_id: id })
}
async function independent(user) {
  const api = client()
  unwrap(await api.auth.signInWithPassword({ email: user.email, password: user.password }))
  return api
}

try {
  const teacher = await account('Teacher')
  const learner = await account('Learner')
  const reporter = await account('Participant')
  const admin = await account('Administrator', true)
  await check('LOCAL-AUTH', 'Real local signup/login yields three credits; editable metadata cannot grant admin', async () => {
    assert.equal(await balance(learner), 3)
    unwrap(await learner.api.auth.updateUser({ data: { is_admin: true } }))
    unwrap(await learner.api.auth.refreshSession())
    assert.equal(unwrap(await learner.api.rpc('is_admin')), false)
    assert.equal(unwrap(await admin.api.rpc('is_admin')), true)
    assert.deepEqual(unwrap(await learner.api.from('profiles').select('credits_balance').eq('id', teacher.id)), [])
    const publicTeacher = unwrap(await learner.api.from('public_profiles').select('*').eq('id', teacher.id).single())
    assert.equal(Object.hasOwn(publicTeacher, 'credits_balance'), false)
    assert.equal(Object.hasOwn(publicTeacher, 'is_admin'), false)
  })
  const skill = unwrap(await teacher.api.from('skills').insert({ user_id: teacher.id, title: `Guitar ${suffix()}`, description: 'Learn beginner chords.', category: 'Music', listing_type: 'Teacher', tags: ['guitar'], experience_level: 'Beginner', format: 'Online', language: 'English' }).select('id').single()).id
  await check('LOCAL-SETTLEMENT', 'Only learner confirms; one credit moves and replay is rejected', async () => {
    const id = await ready(learner, teacher, skill)
    assert.ok((await confirm(teacher, id)).error)
    const result = unwrap(await confirm(learner, id))
    assert.equal(result.transferred_credits, 1)
    assert.equal(await balance(learner), 2)
    assert.equal(await balance(teacher), 4)
    assert.ok((await confirm(learner, id)).error)
    assert.equal(await status(id), 'completed')
    assert.equal(await balance(learner), 2)
  })
  await check('LOCAL-CONCURRENT-REPLAY', 'Five independent authenticated requests settle one exchange exactly once', async () => {
    const id = await ready(learner, teacher, skill)
    const sessions = await Promise.all(Array.from({ length: 5 }, () => independent(learner)))
    const results = await Promise.all(sessions.map(api => api.rpc('confirm_skill_exchange', { p_exchange_id: id })))
    assert.equal(results.filter(result => !result.error).length, 1)
    assert.equal(results.filter(result => result.error).length, 4)
    assert.equal(await balance(learner), 1)
    assert.equal(await balance(teacher), 5)
    return 'One success, four rejections; learner 1, teacher 5'
  })
  await check('LOCAL-LAST-CREDIT', 'Competing exchanges cannot spend the same final credit', async () => {
    const ids = [await ready(learner, teacher, skill), await ready(learner, teacher, skill)]
    const sessions = await Promise.all(ids.map(() => independent(learner)))
    const results = await Promise.all(ids.map((id, index) => sessions[index].rpc('confirm_skill_exchange', { p_exchange_id: id })))
    assert.equal(results.filter(result => !result.error).length, 1)
    assert.equal(results.filter(result => result.error).length, 1)
    assert.equal(await balance(learner), 0)
    assert.equal(await balance(teacher), 6)
    assert.equal((await Promise.all(ids.map(status))).filter(value => value === 'completed').length, 1)
    return 'One settlement, one insufficient-funds rejection; learner 0, teacher 6'
  })
  await check('LOCAL-DISPUTE', 'Participant report blocks confirmation; admin closure is audited without payment', async () => {
    const id = await ready(reporter, teacher, skill, false)
    const before = [await balance(reporter), await balance(teacher)]
    const dispute = unwrap(await teacher.api.rpc('submit_skill_dispute', { p_exchange_id: id, p_reason: 'Missed session', p_details: 'The scheduled lesson did not take place.' }))
    assert.equal(await status(id), 'issue_reported')
    assert.ok((await confirm(reporter, id)).error)
    assert.ok((await reporter.api.rpc('review_skill_dispute', { p_dispute_id: dispute.id, p_status: 'resolved', p_explanation: 'Close the reported lesson without payment.' })).error)
    for (const next of ['under_review', 'resolved']) unwrap(await admin.api.rpc('review_skill_dispute', { p_dispute_id: dispute.id, p_status: next, p_explanation: 'The reported lesson is closed without payment.' }))
    assert.deepEqual([await balance(reporter), await balance(teacher)], before)
    const actions = unwrap(await admin.api.from('dispute_actions').select('actor_id,detail').eq('dispute_id', dispute.id))
    assert.equal(actions.length, 2)
    assert(actions.every(action => action.actor_id === admin.id))
    assert.ok((await admin.api.rpc('review_skill_dispute', { p_dispute_id: dispute.id, p_status: 'under_review', p_explanation: 'Attempting to reopen a resolved lesson report.' })).error)
  })
  await check('LOCAL-DISPUTE-RACE', 'Confirmation and reporting serialize to one valid outcome', async () => {
    const id = await ready(reporter, teacher, skill)
    const before = [await balance(reporter), await balance(teacher)]
    const learnerSession = await independent(reporter)
    const teacherSession = await independent(teacher)
    const results = await Promise.all([
      learnerSession.rpc('confirm_skill_exchange', { p_exchange_id: id }),
      teacherSession.rpc('submit_skill_dispute', { p_exchange_id: id, p_reason: 'Session issue', p_details: 'A participant reported a problem with this lesson.' }),
    ])
    assert.equal(results.filter(result => !result.error).length, 1)
    const state = await status(id)
    const disputes = unwrap(await maintenance.from('disputes').select('id,status').eq('exchange_id', id))
    if (state === 'completed') {
      assert.equal(disputes.length, 0)
      assert.deepEqual([await balance(reporter), await balance(teacher)], [before[0] - 1, before[1] + 1])
    } else {
      assert.equal(state, 'issue_reported')
      assert.equal(disputes.length, 1)
      assert.deepEqual([await balance(reporter), await balance(teacher)], before)
    }
    return `One success, one rejection; resulting exchange ${state}`
  })
  await check('LOCAL-STORAGE', 'Public URL denied; uploader/admin downloads succeed; unrelated download denied', async () => {
    const key = `${teacher.id}/${randomUUID()}.mp4`
    unwrap(await maintenance.storage.from('verification-videos').upload(key, new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), { contentType: 'video/mp4' }))
    const publicUrl = teacher.api.storage.from('verification-videos').getPublicUrl(key).data.publicUrl
    assert.equal(new URL(publicUrl).hostname, '127.0.0.1')
    const publicResponse = await fetch(publicUrl)
    assert.equal(publicResponse.ok, false)
    assert.equal(unwrap(await teacher.api.storage.from('verification-videos').download(key)).size, 8)
    assert.equal(unwrap(await admin.api.storage.from('verification-videos').download(key)).size, 8)
    assert.ok((await reporter.api.storage.from('verification-videos').download(key)).error)
    return `Public HTTP ${publicResponse.status}; owner/admin permitted; unrelated member denied`
  })
  // Dedicated browser fixtures have independent balances and no prior history.
  const uiTeacher = await account('BrowserTeacher')
  const uiLearner = await account('BrowserLearner')
  const envPath = '.env.e2e.local'
  try {
    await access(envPath)
    const existing = await readFile(envPath, 'utf8')
    assert(existing.startsWith('# Local Supabase integration fixtures.'), 'Existing live-test configuration must not be overwritten.')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  const values = { E2E_SUPABASE_URL: url, E2E_SUPABASE_KEY: runtime.ANON_KEY,
    E2E_TEACHER_EMAIL: uiTeacher.email, E2E_TEACHER_PASSWORD: uiTeacher.password,
    E2E_LEARNER_EMAIL: uiLearner.email, E2E_LEARNER_PASSWORD: uiLearner.password,
    E2E_CONFIRM_DATA_WRITES: 'yes' }
  await writeFile(envPath, '# Local Supabase integration fixtures. Never commit.\n' + Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 })
} catch (error) {
  setupError = error.message
  console.error(`Local integration failed: ${error.message}`)
  process.exitCode = 1
} finally {
  const hashes = {}
  for (const name of ['disputes_and_verification.sql', 'mvp_security_hardening.sql']) hashes[name] = createHash('sha256').update(await readFile(`supabase/${name}`)).digest('hex')
  const report = { startedAt, finishedAt: new Date().toISOString(), target: url,
    scope: 'Real Docker Supabase Auth, Data API, Storage HTTP and independent concurrent requests. No hosted services tested.',
    migrations: hashes, cases, setupError, retainedFixtureCount: accounts.length,
    fixturePolicy: 'Synthetic accounts, skill/exchange/dispute history and one storage object retained in local test database.' }
  await writeFile(`${directory}/workflow-api-results.json`, JSON.stringify(report, null, 2) + '\n')
  await writeFile(`${directory}/fixture-accounts.json`, JSON.stringify(accounts.map(({ api: _api, ...fixture }) => { void _api; return fixture }), null, 2) + '\n', { mode: 0o600 })
  console.log(`${cases.filter(row => row.status === 'PASS').length}/${cases.length} local API integration cases passed`)
}
