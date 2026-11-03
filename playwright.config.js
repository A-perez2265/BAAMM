import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Never load team database credentials from the application's normal .env files.
config({ path: '.env.e2e.local', quiet: true })
const live = process.env.E2E_LIVE === '1'
if (live) {
  const required = ['E2E_SUPABASE_URL', 'E2E_SUPABASE_KEY', 'E2E_TEACHER_EMAIL',
    'E2E_TEACHER_PASSWORD', 'E2E_LEARNER_EMAIL', 'E2E_LEARNER_PASSWORD']
  if (required.some(key => !process.env[key]) || process.env.E2E_CONFIRM_DATA_WRITES !== 'yes') {
    throw new Error('Live tests require dedicated credentials and E2E_CONFIRM_DATA_WRITES=yes in .env.e2e.local. See docs/browser-testing.md.')
  }
  if (process.env.E2E_TEACHER_EMAIL.toLowerCase() === process.env.E2E_LEARNER_EMAIL.toLowerCase()) {
    throw new Error('Teacher and learner must be different dedicated test accounts.')
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/browser-run',
  fullyParallel: false,
  workers: 1,
  retries: 0, // Repeating a live workflow can transfer another credit.
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['./tests/e2e/evidence-reporter.js']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4178',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'smoke', testMatch: '**/smoke.spec.js' },
    { name: 'regression', testMatch: ['**/profile-skills.spec.js', '**/account-and-discovery.spec.js'] },
    { name: 'live', testMatch: '**/exchange.live.spec.js' },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: live ? process.env.E2E_SUPABASE_URL : 'https://browser-tests.invalid',
      VITE_SUPABASE_ANON_KEY: live ? process.env.E2E_SUPABASE_KEY : 'offline-placeholder',
      VITE_SUPABASE_PUBLISHABLE_KEY: live ? process.env.E2E_SUPABASE_KEY : 'offline-placeholder',
    },
  },
})
