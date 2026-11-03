import { test as signedOutTest } from '@playwright/test'
import { test, expect, OTHER_ID } from './fixtures/mock-supabase.js'

for (const fail of [false, true]) {
  signedOutTest(`SIGNUP-${fail ? 'ERROR' : 'CONFIRM'}: registration needs no video and ${fail ? 'retains input on Auth failure' : 'explains email confirmation'}`, async ({ page, context }, testInfo) => {
    const requests = []
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === 'http://127.0.0.1:4178') return route.continue()
      requests.push({ method: request.method(), path: url.pathname })
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
      if (url.origin !== 'https://browser-tests.invalid') return route.abort()
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      if (url.pathname === '/rest/v1/profiles') return route.fulfill({ status: 200, headers, contentType: 'application/json', body: 'null' })
      if (url.pathname === '/auth/v1/signup') {
        const payload = request.postDataJSON()
        expect(payload.data).toEqual({ username: 'newmember', display_name: 'New Member', general_location: 'Austin, TX' })
        return route.fulfill({ status: fail ? 422 : 200, headers, contentType: 'application/json',
          body: JSON.stringify(fail ? { code: 'user_already_exists', msg: 'User already registered' } : { user: { id: '30000000-0000-4000-8000-000000000001', email: payload.email }, session: null }) })
      }
      return route.abort()
    })
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click()
    await expect(page.locator('input[type=file]')).toHaveCount(0)
    await page.getByLabel('Username', { exact: false }).fill('newmember')
    await page.getByLabel('Display Name', { exact: true }).fill('New Member')
    await page.getByLabel('General Location', { exact: true }).fill('Austin, TX')
    await page.getByLabel('Email Address', { exact: false }).fill('new@example.test')
    await page.getByLabel(/^Password/).fill('ExamplePass!One7')
    await page.getByLabel('Confirm Password', { exact: false }).fill('ExamplePass!One7')
    await page.getByRole('button', { name: 'Create Account', exact: true }).click()
    if (fail) {
      await expect(page.getByRole('alert')).toContainText('User already registered')
      await expect(page.getByLabel('Username', { exact: false })).toHaveValue('newmember')
    } else {
      await expect(page.getByText(/Check your email to confirm your address/)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible()
    }
    expect(requests.filter(request => request.path.includes('/storage/'))).toEqual([])
    expect(requests.filter(request => request.method === 'POST' && request.path === '/auth/v1/signup')).toHaveLength(1)
    await testInfo.attach('registration-result', { body: await page.screenshot(), contentType: 'image/png' })
  })
}

test('ADMIN-DENY: user metadata cannot bypass a denied administrator RPC', async ({ page, context, mockBackend }) => {
  mockBackend.setUserMetadata({ is_admin: true })
  await context.addInitScript(() => {
    const session = JSON.parse(localStorage.getItem('sb-browser-tests-auth-token'))
    session.user.user_metadata.is_admin = true
    localStorage.setItem('sb-browser-tests-auth-token', JSON.stringify(session))
  })
  await page.goto('/admin')
  await expect(page).toHaveURL('http://127.0.0.1:4178/')
  await expect(page.getByText('Review or closure explanation', { exact: true })).toHaveCount(0)
})

test('SEARCH-INTEGRATION: teacher profile links, request selection and empty-tag fallback survive the merged search update', async ({ page, mockBackend }, testInfo) => {
  const listingId = '20000000-0000-4000-8000-000000000002'
  mockBackend.addListing({ id: listingId, user_id: OTHER_ID, title: 'Watercolor Basics',
    description: 'Practice simple watercolor washes.', category: 'Art', listing_type: 'Teacher',
    tags: [], experience_level: 'Beginner', format: 'Online', language: 'English', location: 'Austin, TX' })
  await page.goto('/search')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Watercolor Basics', exact: true }) })
  await expect(card.getByRole('link', { name: 'Other Member', exact: true })).toHaveAttribute('href', `/profile/${OTHER_ID}`)
  await expect(card.getByRole('link', { name: 'Request Exchange', exact: true })).toHaveAttribute('href', `/request?skill=${listingId}`)
  await expect(page.getByRole('heading', { name: 'Guitar Basics', exact: true })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Search skills', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'No tags on these listings yet.' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Search skills', exact: true }).fill('No matching listing')
  const empty = page.getByRole('heading', { name: 'No Results found.', exact: true }).locator('..')
  await expect(empty).toBeVisible()
  await empty.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(card).toBeVisible()
  await testInfo.attach('merged-search-page', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})
