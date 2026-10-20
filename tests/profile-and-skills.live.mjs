import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

// Intentionally accepts no hosted URL or environment override.
const runtime = JSON.parse(await readFile(new URL('../.local-supabase/runtime.json', import.meta.url), 'utf8'))
const localUrl = 'http://127.0.0.1:54321'
assert.equal(runtime.API_URL, localUrl, 'This suite only supports the isolated local Supabase stack.')
assert.equal(new URL(runtime.DB_URL).hostname, '127.0.0.1')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const client = () => createClient(localUrl, runtime.ANON_KEY, options)
const admin = createClient(localUrl, runtime.SERVICE_ROLE_KEY, options)
const users = []
const results = []
const cleanupErrors = []
const runId = randomUUID()
const reportDir = new URL('../test-results/profile-skills-live/', import.meta.url)
const startedAt = new Date().toISOString()
let setupError

function unwrap({ data, error }) {
  if (error) throw error
  return data
}
async function provision(label) {
  const api = client()
  const suffix = randomBytes(8).toString('hex')
  const email = `local_${label}_${suffix}@example.test`
  const password = randomBytes(24).toString('base64url')
  const signup = unwrap(await api.auth.signUp({ email, password, options: { data: { username: `local_${suffix}`, display_name: `Local ${label}` } } }))
  assert.ok(signup.user?.id, 'Signup must return a real local user.')
  const user = { api, id: signup.user.id }
  users.push(user) // Track immediately so a failed login still permits cleanup.
  const login = unwrap(await api.auth.signInWithPassword({ email, password }))
  assert.equal(login.user.id, user.id)
  assert.ok(login.session?.access_token)
  return user
}
async function profile(user) {
  return unwrap(await user.api.from('profiles').select('id, username, display_name, bio, credits_balance, is_admin').eq('id', user.id).single())
}
async function skill(user, id) {
  return unwrap(await user.api.from('skills').select('*').eq('id', id).single())
}
async function check(id, scenario, test) {
  try {
    await test()
    results.push({ id, scenario, status: 'PASS', actual: 'All assertions passed.' })
    console.log(`PASS ${id}: ${scenario}`)
  } catch (error) {
    const actual = error.message || String(error)
    results.push({ id, scenario, status: 'FAIL', actual })
    console.error(`FAIL ${id}: ${scenario}\n${actual}`)
  }
}
const skillPayload = (owner) => ({
  user_id: owner.id, listing_type: 'Teacher', title: 'Local guitar lesson',
  description: 'Practice chords together.', category: 'Music', tags: ['guitar'],
  experience_level: 'Beginner', format: 'Online', language: 'English',
})
async function withSkill(owner, test) {
  const created = unwrap(await owner.api.from('skills').insert(skillPayload(owner)).select().single())
  try { await test(created) } finally {
    // Cleanup uses only this run's specific fixture ID, even if a security assertion fails.
    unwrap(await admin.from('skills').delete().eq('id', created.id))
  }
}
try {
  const a = await provision('Alpha')
  const b = await provision('Beta')
  const c = await provision('Charlie')
  await check('LIVE-PRF-01', 'Signup provisions distinct non-admin profiles with three credits', async () => {
    assert.equal(new Set(users.map(user => user.id)).size, 3)
    for (const user of users) {
      const row = await profile(user)
      assert.equal(row.id, user.id)
      assert.equal(row.credits_balance, 3)
      assert.equal(row.is_admin, false)
    }
  })
  await check('LIVE-PRF-02', 'Own profile changes persist on a separate read', async () => {
    unwrap(await a.api.from('profiles').update({ display_name: 'Local profile edited', bio: 'Sharing guitar skills.' }).eq('id', a.id).select().single())
    const row = await profile(a)
    assert.equal(row.display_name, 'Local profile edited')
    assert.equal(row.bio, 'Sharing guitar skills.')
  })
  await check('LIVE-PRF-03', 'Cross-user profile update is denied and preserves the target row', async () => {
    const before = await profile(b)
    const { data, error } = await a.api.from('profiles').update({ display_name: 'Unauthorized change' }).eq('id', b.id).select()
    if (error) assert.equal(error.code, '42501')
    else assert.deepEqual(data, [])
    assert.deepEqual(await profile(b), before)
  })
  for (const [id, field, value] of [['LIVE-PRF-04', 'credits_balance', 999], ['LIVE-PRF-05', 'is_admin', true]]) {
    await check(id, `Ordinary user cannot change own ${field}`, async () => {
      const before = await profile(a)
      const { error } = await a.api.from('profiles').update({ [field]: value }).eq('id', a.id).select()
      assert.ok(error, 'Sensitive-field update must be rejected.')
      assert.match(error.message, /Only admins can change/)
      assert.deepEqual(await profile(a), before)
    })
  }
  await check('LIVE-PRF-06', 'Duplicate username is rejected without modifying the profile', async () => {
    const before = await profile(a)
    const target = await profile(b)
    const { error } = await a.api.from('profiles').update({ username: target.username }).eq('id', a.id)
    assert.equal(error?.code, '23505')
    assert.deepEqual(await profile(a), before)
  })
  await check('LIVE-PRF-07', 'Direct profile API write cannot bypass email privacy validation', async () => {
    const before = await profile(a)
    const { error } = await a.api.from('profiles').update({ bio: 'Contact member@example.test' }).eq('id', a.id)
    assert.equal(error?.code, '23514')
    assert.match(error.message, /PUBLIC_CONTACT_DETAILS/)
    assert.deepEqual(await profile(a), before)
  })
  await check('LIVE-SKL-01', 'Own skill creation, editing, and deletion persist on separate reads', async () => {
    await withSkill(a, async created => {
      assert.equal((await skill(a, created.id)).user_id, a.id)
      unwrap(await a.api.from('skills').update({ title: 'Edited local guitar lesson' }).eq('id', created.id).select().single())
      assert.equal((await skill(a, created.id)).title, 'Edited local guitar lesson')
      const deleted = unwrap(await a.api.from('skills').delete().eq('id', created.id).select('id'))
      assert.deepEqual(deleted, [{ id: created.id }])
      assert.equal(unwrap(await a.api.from('skills').select('id').eq('id', created.id).maybeSingle()), null)
    })
  })
  await check('LIVE-SKL-02', 'Skill insertion cannot spoof another owner', async () => {
    const id = randomUUID()
    const { error } = await a.api.from('skills').insert({ ...skillPayload(b), id })
    assert.equal(error?.code, '42501')
    assert.equal(unwrap(await b.api.from('skills').select('id').eq('id', id).maybeSingle()), null)
  })
  for (const action of ['update', 'delete']) {
    await check(action === 'update' ? 'LIVE-SKL-03' : 'LIVE-SKL-04', `Cross-user skill ${action} is denied and preserves the record`, async () => {
      await withSkill(b, async created => {
        const query = a.api.from('skills')
        const mutation = action === 'update' ? query.update({ title: 'Unauthorized edit' }) : query.delete()
        const { data, error } = await mutation.eq('id', created.id).select()
        if (error) assert.equal(error.code, '42501')
        else assert.deepEqual(data, [])
        assert.deepEqual(await skill(b, created.id), created)
      })
    })
  }
  await check('LIVE-SKL-05', 'Own skill cannot be reassigned to another user', async () => {
    await withSkill(a, async created => {
      const { error } = await a.api.from('skills').update({ user_id: b.id }).eq('id', created.id).select()
      assert.equal(error?.code, '42501')
      assert.deepEqual(await skill(a, created.id), created)
    })
  })
  await check('LIVE-SKL-06', 'Database rejects unsupported listing types', async () => {
    const id = randomUUID()
    const { error } = await a.api.from('skills').insert({ ...skillPayload(a), id, listing_type: 'Administrator' })
    assert.equal(error?.code, '23514')
    assert.equal(unwrap(await a.api.from('skills').select('id').eq('id', id).maybeSingle()), null)
  })
  await check('LIVE-SKL-07', 'Direct skill API write cannot bypass email privacy validation', async () => {
    const id = randomUUID()
    const { error } = await a.api.from('skills').insert({ ...skillPayload(a), id, title: 'Contact member@example.test' })
    assert.equal(error?.code, '23514')
    assert.match(error.message, /PUBLIC_CONTACT_DETAILS/)
    assert.equal(unwrap(await a.api.from('skills').select('id').eq('id', id).maybeSingle()), null)
  })
  // Separate fixture: an unexpected privilege grant must not contaminate ordinary-user checks.
  await check('LIVE-PRF-08', 'User-editable metadata cannot grant administrator privileges', async () => {
    assert.equal(unwrap(await c.api.rpc('is_admin')), false, 'Fixture starts without admin privileges.')
    unwrap(await c.api.auth.updateUser({ data: { is_admin: true } }))
    unwrap(await c.api.auth.refreshSession())
    assert.equal(unwrap(await c.api.rpc('is_admin')), false, 'User-controlled metadata must not make is_admin() return true.')
  })
} catch (error) {
  setupError = error.message || String(error)
  console.error(`Setup/execution failed: ${setupError}`)
} finally {
  for (const user of users) {
    try {
      unwrap(await user.api.auth.signOut())
      unwrap(await admin.auth.admin.deleteUser(user.id))
      assert.equal(unwrap(await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()), null)
      assert.deepEqual(unwrap(await admin.from('skills').select('id').eq('user_id', user.id)), [])
    } catch (error) { cleanupErrors.push(error.message || String(error)) }
  }
  const report = {
    runId, startedAt, finishedAt: new Date().toISOString(), target: localUrl,
    scope: 'Real local Supabase APIs against a scoped profile/skill snapshot; hosted database not tested.',
    results, setupError, cleanupErrors, fixturesRemoved: users.length - cleanupErrors.length,
  }
  await mkdir(reportDir, { recursive: true })
  await writeFile(new URL('latest.json', reportDir), JSON.stringify(report, null, 2) + '\n')
  const escape = value => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>')
  const summary = `${results.filter(result => result.status === 'PASS').length} passed; ${results.filter(result => result.status === 'FAIL').length} failed`
  await writeFile(new URL('latest.md', reportDir), `# Profile and Skill Live Integration Results\n\nRun: ${runId}\n\nStarted: ${startedAt}\n\nTarget: ${localUrl}\n\n${report.scope}\n\nOutcome: ${summary}\n\n| ID | Scenario / expected behavior | Actual result | Status |\n|---|---|---|---|\n${results.map(result => `| ${result.id} | ${escape(result.scenario)} | ${escape(result.actual)} | ${result.status} |`).join('\n')}\n\nSetup error: ${setupError || 'None'}\n\nCleanup: ${report.fixturesRemoved}/${users.length} generated users removed; profile/skill deletion verified.\n\n${cleanupErrors.map(escape).join('\n')}\n`)
  console.log(`${summary}. Report: test-results/profile-skills-live/latest.md`)
  if (setupError || cleanupErrors.length || results.length !== 15 || results.some(result => result.status === 'FAIL')) process.exitCode = 1
}
