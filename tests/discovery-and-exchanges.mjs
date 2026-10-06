import assert from 'node:assert/strict'
import { createServer } from 'vite'

let response
let calls = []
let tableResponses = {}
function createQuery(table) {
  const query = new Proxy({}, { get(_target, method) {
    if (method === 'then') return (resolve) => resolve(tableResponses[table] ?? response)
    return (...args) => { calls.push([method, ...args]); return query }
  } })
  return query
}
globalThis.__exchangeTestClient = {
  from(table) { calls.push(['from', table]); return createQuery(table) },
  rpc(name, args) { calls.push(['rpc', name, args]); return Promise.resolve(response) },
}
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  plugins: [{
    name: 'mock-exchange-client',
    enforce: 'pre',
    resolveId(id) { if (/\/supabaseClient(?:\.js)?$/.test(id)) return '\0exchange-client' },
    load(id) { if (id === '\0exchange-client') return 'export const supabase = globalThis.__exchangeTestClient' },
  }],
})
try {
  const discovery = await server.ssrLoadModule('/src/services/discoveryService.js')
  const exchange = await server.ssrLoadModule('/src/services/exchangeService.js')
  const skill = { id: 'guitar', title: 'Guitar lessons', description: 'Learn chords', tags: ['acoustic', 'music'], location: 'San Antonio', language: 'English', category: 'Music' }
  for (const term of ['', ' GUITAR ', 'chords', 'acoustic', 'san antonio', 'english', 'music']) assert.equal(discovery.skillMatchesQuery(skill, term), true, term)
  assert.equal(discovery.skillMatchesQuery(skill, 'python'), false)
  assert.equal(discovery.skillMatchesQuery({}, 'guitar'), false)
  response = { data: [skill], error: null }
  assert.deepEqual(await discovery.getDiscoverableSkills('learner'), [skill])
  assert.ok(calls.some(([method, column, value]) => method === 'eq' && column === 'listing_type' && value === 'Teacher'))
  assert.ok(calls.some(([method, column, value]) => method === 'neq' && column === 'user_id' && value === 'learner'))
  response = { data: null, error: { message: 'Listings unavailable' } }
  await assert.rejects(discovery.getDiscoverableSkills('learner'), error => error.message === 'Listings unavailable')

  calls = []
  response = { data: { credits_balance: 0 }, error: null }
  const request = { learnerId: 'learner', teacherId: 'teacher', skillId: 'guitar', message: 'Teach me chords' }
  await assert.rejects(exchange.createExchangeRequest(request), /at least 1 credit/)
  assert.equal(calls.some(([method]) => method === 'insert'), false)
  await assert.rejects(exchange.createExchangeRequest({ ...request, teacherId: 'learner' }), /yourself/)
  await assert.rejects(exchange.createExchangeRequest({ ...request, message: '  ' }), /message/)

  calls = []
  response = { data: { id: 'request', credits_balance: 2 }, error: null }
  await exchange.createExchangeRequest({ ...request, message: '  Teach me chords  ' })
  assert.deepEqual(calls.find(([method]) => method === 'insert')[1], {
    learner_id: 'learner', teacher_id: 'teacher', skill_id: 'guitar', message: 'Teach me chords', status: 'pending',
  })
  assert.equal(calls.filter(([method]) => method === 'insert').length, 1)
  assert.deepEqual(calls.filter(([method]) => method === 'eq'), [
    ['eq', 'id', 'learner'], ['eq', 'id', 'guitar'],
    ['eq', 'user_id', 'teacher'], ['eq', 'listing_type', 'Teacher'],
  ])
  calls = []
  tableResponses = { skills: { data: null, error: null } }
  await assert.rejects(exchange.createExchangeRequest(request), error => error.code === 'LISTING_UNAVAILABLE')
  assert.equal(calls.some(([method]) => method === 'insert'), false)
  tableResponses = { skills: { data: null, error: { message: 'Cannot verify listing' } } }
  await assert.rejects(exchange.createExchangeRequest(request), error => error.message === 'Cannot verify listing')
  assert.equal(calls.some(([method]) => method === 'insert'), false)
  tableResponses = {}
  calls = []
  await exchange.respondToIncomingRequest({ exchangeId: 'request', teacherId: 'teacher', nextStatus: 'accepted' })
  assert.deepEqual(calls.filter(([method]) => method === 'eq'), [['eq', 'id', 'request'], ['eq', 'teacher_id', 'teacher'], ['eq', 'status', 'pending']])
  await assert.rejects(exchange.respondToIncomingRequest({ nextStatus: 'completed' }), /Invalid/)
  calls = []
  await exchange.markExchangeComplete({ exchangeId: 'request', teacherId: 'teacher' })
  assert.equal(calls.find(([method]) => method === 'update')[1].status, 'session_completed')
  assert.ok(calls.some(([method, column, value]) => method === 'eq' && column === 'status' && value === 'accepted'))

  calls = []
  response = { data: { success: true, transferred_credits: 1 }, error: null }
  assert.deepEqual(await exchange.confirmExchange({ exchangeId: 'request', learnerId: 'learner' }), response.data)
  assert.deepEqual(calls, [['rpc', 'confirm_skill_exchange', { p_exchange_id: 'request' }]])
  for (const error of [{ code: 'PGRST202', message: 'Could not find the function' }, { message: 'Insufficient credits' }]) {
    calls = []
    response = { data: null, error }
    await assert.rejects(exchange.confirmExchange({ exchangeId: 'request' }), failure => failure === error)
    assert.deepEqual(calls, [['rpc', 'confirm_skill_exchange', { p_exchange_id: 'request' }]])
  }
  console.log('Passed: discovery filtering, teacher-only listings, request validation, ownership/status guards, exact confirmation RPC, and failure propagation without a status-only fallback. Database calls were simulated.')
} finally {
  await server.close()
  delete globalThis.__exchangeTestClient
}
