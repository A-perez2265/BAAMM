import assert from 'node:assert/strict'
import { createServer } from 'vite'
let result = { data: { user: { id: 'test-user' } }, error: null }
let calls = []
globalThis.__recoveryTestClient = { auth: {
  resetPasswordForEmail: async (...args) => { calls.push(['reset', ...args]); return result },
  updateUser: async (...args) => { calls.push(['update', ...args]); return result },
} }
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  plugins: [{ name: 'mock-recovery-client', enforce: 'pre',
    resolveId(id) { if (/\/supabaseClient(?:\.js)?$/.test(id)) return '\0recovery-test-client' },
    load(id) { if (id === '\0recovery-test-client') return 'export const supabase = globalThis.__recoveryTestClient' },
  }],
})
try {
  const { validateNewPassword, requestPasswordReset, updatePassword } = await server.ssrLoadModule('/src/services/passwordRecoveryService.js')
  assert.match(validateNewPassword('short', 'short'), /8 characters/)
  assert.match(validateNewPassword('synthetic-passphrase', 'different-passphrase'), /not match/)
  assert.equal(validateNewPassword('synthetic-passphrase', 'synthetic-passphrase'), '')
  await requestPasswordReset(' test@example.com ', 'http://127.0.0.1:5175')
  assert.deepEqual(calls.pop(), ['reset', 'test@example.com', { redirectTo: 'http://127.0.0.1:5175/reset-password' }])
  await requestPasswordReset('test@example.com', 'https://skillswap.example.com')
  assert.equal(calls.pop()[2].redirectTo, 'https://skillswap.example.com/reset-password')
  await updatePassword(' synthetic passphrase ')
  assert.deepEqual(calls.pop(), ['update', { password: ' synthetic passphrase ' }])
  result = { data: null, error: { code: 'otp_expired' } }
  await assert.rejects(updatePassword('synthetic-passphrase'), error => error.code === 'otp_expired')
  result = { data: null, error: { status: 429 } }
  await assert.rejects(requestPasswordReset('test@example.com', 'http://127.0.0.1:5175'), error => error.status === 429)
  result = { data: { user: null }, error: null }
  await assert.rejects(updatePassword('synthetic-passphrase'), /confirm/)
  console.log('Passed: password validation, origin-specific email redirects, exact password update payload, API failures, and missing-user handling. No real email or password was changed.')
} finally {
  await server.close()
  delete globalThis.__recoveryTestClient
}
