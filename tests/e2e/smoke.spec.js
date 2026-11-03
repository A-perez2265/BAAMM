import { test, expect } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  // These tests cover local UI behavior only. No external backend request is allowed.
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort()
  })
})

for (const path of ['/profile', '/skills', '/incoming', '/confirm']) {
  test(`SMOKE: signed-out visitor to ${path} reaches login`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible()
    await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
  })
}

test('SMOKE: mobile login has labelled fields and fits the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible()
  await page.getByLabel('Email Address', { exact: true }).fill('invalid-email')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page.getByLabel('Email Address', { exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
