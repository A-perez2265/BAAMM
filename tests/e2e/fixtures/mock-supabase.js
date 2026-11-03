import { Buffer } from 'node:buffer'
import { test as base, expect } from '@playwright/test'

export const OWNER_ID = '10000000-0000-4000-8000-000000000001'
export const OTHER_ID = '10000000-0000-4000-8000-000000000002'
const ownSkillId = '20000000-0000-4000-8000-000000000001'

export const test = base.extend({
  mockBackend: [async ({ context }, runFixture, testInfo) => {
    const user = { id: OWNER_ID, aud: 'authenticated', role: 'authenticated',
      email: 'member@example.test', app_metadata: { provider: 'email' },
      user_metadata: { display_name: 'Test Member', username: 'test.member' } }
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url')
    const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: OWNER_ID, exp: expiresAt, role: 'authenticated' })}.mock-signature`,
      refresh_token: 'mock-refresh-token', expires_at: expiresAt, expires_in: 3600, token_type: 'bearer', user }
    await context.addInitScript(value => {
      localStorage.setItem('sb-browser-tests-auth-token', JSON.stringify(value))
    }, session)

    const profiles = [
      { id: OWNER_ID, display_name: 'Test Member', username: 'test.member', bio: 'Learning and sharing.', location: 'San Antonio, TX', avatar_id: null },
      { id: OTHER_ID, display_name: 'Other Member', username: 'other.member', bio: 'Watercolor teacher.', location: 'Austin, TX', avatar_id: null },
    ]
    let skills = [{ id: ownSkillId, user_id: OWNER_ID, title: 'Guitar Basics', description: 'Learn simple chords.',
      category: 'Music', listing_type: 'Teacher', tags: ['guitar'], experience_level: 'Beginner',
      format: 'Online', language: 'English', location: 'San Antonio, TX', created_at: '2026-01-01T12:00:00Z' }]
    const writes = []
    const unexpected = []
    const rules = []
    const releasePending = []
    let counter = 10
    const mockBackend = {
      writes,
      addListing(listing) { skills.push({ ...listing }) },
      setUserMetadata(value) { Object.assign(user.user_metadata, value) },
      failNext(table, method, { code = 'XX000', message = 'Simulated server failure', status = 500 } = {}) {
        rules.push({ table, method, error: { code, message, status } })
      },
      holdNext(table, method) {
        let started, release
        const pending = new Promise(resolve => { started = resolve })
        const gate = new Promise(resolve => { release = resolve })
        releasePending.push(release)
        rules.push({ table, method, started, gate, release })
        return { started: pending, release }
      },
    }
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === 'http://127.0.0.1:4178') return route.continue()
      const headers = { 'access-control-allow-origin': 'http://127.0.0.1:4178',
        'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' }
      const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
      // No external request, including an unexpected real team URL, ever passes through.
      if (url.origin !== 'https://browser-tests.invalid') {
        unexpected.push(`${request.method()} ${url.origin}${url.pathname}`)
        return route.abort()
      }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      if (url.pathname === '/auth/v1/user' && request.method() === 'GET') return send(user)
      if (url.pathname === '/rest/v1/rpc/is_admin') return send(false)
      if (url.pathname === '/rest/v1/exchanges' && request.method() === 'GET') return send([])
      const table = url.pathname.replace('/rest/v1/', '')
      const method = request.method()
      if (!url.pathname.startsWith('/rest/v1/') || !['profiles', 'public_profiles', 'skills'].includes(table) ||
          !['GET', 'POST', 'PATCH', 'DELETE'].includes(method) || (table === 'profiles' && !['GET', 'PATCH'].includes(method)) || (table === 'public_profiles' && method !== 'GET')) {
        unexpected.push(`${method} ${url.pathname}`)
        return send({ message: 'Unimplemented mock request' }, 501)
      }
      const payload = ['POST', 'PATCH'].includes(method) ? request.postDataJSON() : null
      if (method !== 'GET') writes.push({ table, method, payload, filters: Object.fromEntries(url.searchParams) })
      const ruleIndex = rules.findIndex(rule => rule.table === table && rule.method === method)
      if (ruleIndex >= 0) {
        const [rule] = rules.splice(ruleIndex, 1)
        rule.started?.()
        if (rule.gate) await rule.gate
        if (rule.error) return send({ code: rule.error.code, message: rule.error.message }, rule.error.status)
      }
      let rows = table === 'skills' ? skills : profiles
      // Honor equality filters instead of returning success for any requested ID.
      const matches = row => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3)
        if (value.startsWith('neq.')) return String(row[key]) !== value.slice(4)
        return true
      })
      let result = rows.filter(matches)
      if (method === 'POST') {
        const row = { ...payload, id: `20000000-0000-4000-8000-${String(counter++).padStart(12, '0')}`, created_at: new Date().toISOString() }
        skills.push(row)
        result = [row]
      } else if (method === 'PATCH') {
        result.forEach(row => Object.assign(row, payload))
      } else if (method === 'DELETE') {
        skills = skills.filter(row => !matches(row))
      }
      const fields = url.searchParams.get('select')
      if (fields && fields !== '*') result = result.map(row => Object.fromEntries(fields.split(',').map(field => [field, row[field]])))
      if (request.headers().accept?.includes('application/vnd.pgrst.object+json')) {
        if (result.length !== 1) return send({ code: 'PGRST116', message: 'Expected one row' }, 406)
        return send(result[0])
      }
      return send(result, method === 'POST' ? 201 : 200)
    })
    try {
      await runFixture(mockBackend)
    } finally {
      releasePending.forEach(release => release())
      // No credentials/tokens are logged; the requests contain only synthetic test data.
      await testInfo.attach('simulated-api-evidence.json', { body: JSON.stringify({
        backend: 'Simulated Supabase; no real authentication, database persistence or RLS verified',
        viewports: context.pages().map(page => page.viewportSize()), writes, unexpected,
      }, null, 2), contentType: 'application/json' })
      expect(unexpected, 'All backend requests must be known mocks; external requests are blocked').toEqual([])
    }
  }, { auto: true }],
})

export { expect }
