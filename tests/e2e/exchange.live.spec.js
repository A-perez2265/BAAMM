import process from 'node:process'
import { randomBytes } from 'node:crypto'
import { test, expect } from '@playwright/test'

const cardFor = (page, title) => page.getByRole('listitem').filter({
  has: page.getByRole('heading', { name: title, exact: true }),
})

async function signIn(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Email Address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible()
}

async function dashboardNumbers(page) {
  await page.goto('/')
  const balance = page.getByText('Available Balance', { exact: true }).locator('..')
  const ledger = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Credit Ledger', exact: true }),
  })
  await expect(balance).toContainText(/\d+\s+Credits/)
  await expect(page.getByText('Loading active exchanges…', { exact: true })).toHaveCount(0)
  const balanceMatch = (await balance.innerText()).match(/(\d+)\s+Credits/)
  const ledgerText = await ledger.innerText()
  const earnedMatch = ledgerText.match(/\+(\d+) credits/)
  const spentMatch = ledgerText.match(/-(\d+) credits/)
  expect(earnedMatch, 'Dashboard teaching ledger must be numeric').not.toBeNull()
  expect(spentMatch, 'Dashboard learning ledger must be numeric').not.toBeNull()
  return { balance: Number(balanceMatch[1]), earned: Number(earnedMatch[1]), spent: Number(spentMatch[1]) }
}

async function checkpoint(page, testInfo, name) {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
}

test('E2E-EXCHANGE: teacher listing to learner confirmation and persisted dashboard credits', async ({ browser }, testInfo) => {
  test.skip(process.env.E2E_LIVE !== '1', 'Live database writes are disabled; see docs/browser-testing.md.')
  testInfo.annotations.push({ type: 'scope', description: 'Existing confirmed accounts; registration and real teaching are outside this automated test.' })
  const options = { baseURL: testInfo.project.use.baseURL }
  const teacherContext = await browser.newContext(options)
  const learnerContext = await browser.newContext(options)
  const teacher = await teacherContext.newPage()
  const learner = await learnerContext.newPage()
  // Letters avoid the application's public-text phone-number detector.
  const suffix = [...randomBytes(12)].map(value => String.fromCharCode(65 + value % 26)).join('')
  const title = `E2E Guitar ${suffix}`
  let workflowError
  const evidence = { title, environment: process.env.E2E_SUPABASE_URL, startedAt: new Date().toISOString() }

  try {
    await test.step('E2E-01: sign in with isolated teacher and learner sessions; capture initial balances', async () => {
      await signIn(teacher, process.env.E2E_TEACHER_EMAIL, process.env.E2E_TEACHER_PASSWORD)
      await signIn(learner, process.env.E2E_LEARNER_EMAIL, process.env.E2E_LEARNER_PASSWORD)
      evidence.before = { teacher: await dashboardNumbers(teacher), learner: await dashboardNumbers(learner) }
      expect(evidence.before.learner.balance, 'Test learner needs at least one credit; do not auto-grant credits').toBeGreaterThanOrEqual(1)
    })

    await test.step('E2E-02: create a teacher skill through My Skills and verify it survives refresh', async () => {
      await teacher.goto('/skills')
      await teacher.getByRole('button', { name: 'Add a skill', exact: true }).click()
      await teacher.getByLabel('Skill name', { exact: false }).fill(title)
      await teacher.getByLabel('Description', { exact: false }).fill('Practice beginner guitar chords in an automated test session.')
      for (const [label, value] of [['Category', 'Music'], ['Listing type', 'Teacher'], ['Experience level', 'Beginner'], ['Format', 'Online'], ['Language', 'English']]) {
        await teacher.getByRole('combobox', { name: new RegExp(`^${label}\\s`) }).selectOption(value)
      }
      await teacher.getByRole('button', { name: 'Save skill', exact: true }).click()
      await expect(teacher.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await teacher.reload()
      await expect(teacher.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await checkpoint(teacher, testInfo, 'teacher-saved-skill')
      await teacher.goto('/profile')
      await expect(teacher.getByRole('heading', { name: title, exact: true })).toBeVisible()
    })

    await test.step('E2E-03: learner discovers the listing and sends the matching request', async () => {
      await learner.goto('/search')
      await cardFor(learner, title).getByRole('link', { name: 'Request Exchange', exact: true }).click()
      await expect(learner).toHaveURL(/\/request\?skill=/)
      evidence.skillId = new URL(learner.url()).searchParams.get('skill')
      const card = cardFor(learner, title)
      await card.getByLabel('Message', { exact: true }).fill(`Automated lesson request for ${suffix}.`)
      await card.getByRole('button', { name: 'Send request', exact: true }).click()
      await expect(learner.getByText(`Request sent for ${title}.`, { exact: true })).toBeVisible()
    })

    await test.step('E2E-04: teacher accepts and marks the simulated lesson complete', async () => {
      await teacher.goto('/incoming')
      await cardFor(teacher, title).getByRole('button', { name: 'Accept', exact: true }).click()
      await expect(teacher.getByText('Request accepted. Mark it complete after the lesson.', { exact: true })).toBeVisible()
      await cardFor(teacher, title).getByRole('button', { name: 'Mark as Complete', exact: true }).click()
      await expect(teacher.getByText('Marked complete. Waiting for the learner to confirm.', { exact: true })).toBeVisible()
    })

    await test.step('E2E-05: learner confirms; real confirmation RPC reports one transferred credit', async () => {
      await learner.goto('/confirm')
      const responsePromise = learner.waitForResponse(response =>
        new URL(response.url()).pathname.endsWith('/rpc/confirm_skill_exchange') && response.request().method() === 'POST')
      await cardFor(learner, title).getByRole('button', { name: 'Confirm', exact: true }).click()
      const response = await responsePromise
      expect(response.ok(), 'Confirmation RPC must succeed').toBe(true)
      const result = await response.json()
      expect(result).toMatchObject({ success: true, status: 'completed', transferred_credits: 1 })
      evidence.exchangeId = result.exchange_id
      await expect(learner.getByText('Exchange confirmed.', { exact: true })).toBeVisible()
      await learner.reload()
      await expect(learner.getByRole('heading', { name: 'Confirm exchanges', exact: true })).toBeVisible()
      await expect(cardFor(learner, title)).toHaveCount(0)
    })

    await test.step('E2E-06: refreshed dashboards show exact balance/ledger changes and no active test exchange', async () => {
      evidence.after = { teacher: await dashboardNumbers(teacher), learner: await dashboardNumbers(learner) }
      expect(evidence.after.teacher).toEqual({ ...evidence.before.teacher,
        balance: evidence.before.teacher.balance + 1, earned: evidence.before.teacher.earned + 1 })
      expect(evidence.after.learner).toEqual({ ...evidence.before.learner,
        balance: evidence.before.learner.balance - 1, spent: evidence.before.learner.spent + 1 })
      for (const [role, page] of [['teacher', teacher], ['learner', learner]]) {
        const active = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Active Exchanges', exact: true }) })
        await expect(active.getByRole('heading', { name: title, exact: true })).toHaveCount(0)
        await checkpoint(page, testInfo, `${role}-final-dashboard`)
      }
    })
  } catch (error) {
    workflowError = error
  } finally {
    // Preserve listing references, exchanges and transfers as authorized test history.
    evidence.cleanup = 'No automatic deletion. Test-project listing, exchanges and credit changes retained for history.'
    evidence.finishedAt = new Date().toISOString()
    await testInfo.attach('workflow-evidence.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
    await teacherContext.close()
    await learnerContext.close()
  }
  if (workflowError) throw workflowError
})
