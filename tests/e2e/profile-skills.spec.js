import { test, expect, OWNER_ID, OTHER_ID } from './fixtures/mock-supabase'

test.describe('Profile and skill browser regression — SIMULATED backend', () => {
  test.setTimeout(45_000)

  async function editProfile(page) {
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  }

  async function newSkill(page) {
    await page.goto('/skills')
    await page.getByRole('button', { name: 'Add a skill', exact: true }).click()
    await page.getByLabel('Skill name', { exact: false }).fill('Piano Basics')
    await page.getByLabel('Description', { exact: false }).fill('Learn simple melodies.')
    for (const [label, option] of [['Category', 'Music'], ['Listing type', 'Teacher'], ['Experience level', 'Beginner'], ['Format', 'Online'], ['Language', 'English']]) {
      await page.getByRole('combobox', { name: new RegExp(`^${label}\\s`) }).selectOption(option)
    }
  }

  const skillCard = (page, name) => page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
  const writesFor = (backend, table, method) => backend.writes.filter(write => write.table === table && write.method === method)
  const savedProfile = page => expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible()
  const savedSkill = (page, text) => expect(page.getByRole('status').filter({ hasText: text })).toBeVisible()
  async function screenshot(page, testInfo, name, target = page) {
    await testInfo.attach(name, { body: await target.screenshot({ fullPage: true }), contentType: 'image/png' })
  }

  test('PRF-01: profile save persists after reload and navigation', async ({ page, mockBackend }, testInfo) => {
    await editProfile(page)
    await page.getByLabel('Display name', { exact: false }).fill('Updated Member')
    await page.getByLabel('Bio', { exact: false }).fill('Sharing music and art.')
    await page.getByLabel('City, state/region', { exact: false }).fill('Austin, TX')
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    await savedProfile(page)
    await expect(page.getByRole('button', { name: 'Edit profile', exact: true })).toBeFocused()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Updated Member', exact: true })).toBeVisible()
    await expect(page.getByText('Sharing music and art.', { exact: true })).toBeVisible()
    await expect(page.getByText('Austin, TX', { exact: true })).toBeVisible()
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'My Skills', exact: true }).click()
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Updated Member', exact: true })).toBeVisible()
    expect(writesFor(mockBackend, 'profiles', 'PATCH')).toHaveLength(1)
    expect(mockBackend.writes[0].filters.id).toBe(`eq.${OWNER_ID}`)
    await screenshot(page, testInfo, 'saved-profile-after-navigation')
  })

  for (const scenario of [
    { id: 'PRF-02', name: 'server failure', error: {}, message: /Your profile could not be saved/ },
    { id: 'PRF-03', name: 'duplicate username', error: { code: '23505', message: 'Duplicate username', status: 409 }, message: /username is already taken/ },
  ]) {
    test(`${scenario.id}: ${scenario.name} preserves profile edits and permits retry`, async ({ page, mockBackend }, testInfo) => {
      mockBackend.failNext('profiles', 'PATCH', scenario.error)
      await editProfile(page)
      await page.getByLabel('Display name', { exact: false }).fill('Unsaved Member')
      await page.getByRole('button', { name: 'Save profile', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText(scenario.message)
      await expect(page.getByRole('alert')).toBeFocused()
      await expect(page.getByLabel('Display name', { exact: false })).toHaveValue('Unsaved Member')
      await screenshot(page, testInfo, `${scenario.id}-error-preserves-edits`)
      await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Save profile', exact: true }).click()
      await savedProfile(page)
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Unsaved Member', exact: true })).toBeVisible()
      expect(writesFor(mockBackend, 'profiles', 'PATCH')).toHaveLength(2)
    })
  }

  test('PRF-04: delayed profile save shows busy controls and avoids duplicate submissions', async ({ page, mockBackend }) => {
    await editProfile(page)
    const pending = mockBackend.holdNext('profiles', 'PATCH')
    try {
      await page.getByRole('button', { name: 'Save profile', exact: true }).click()
      await pending.started
      await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled()
      await expect(page.getByLabel('Display name', { exact: false })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
      await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
    } finally { pending.release() }
    await savedProfile(page)
    expect(writesFor(mockBackend, 'profiles', 'PATCH')).toHaveLength(1)
  })

  for (const scenario of [
    { id: 'PRF-05', label: 'Bio', value: 'Contact member@example.test', message: /Remove email addresses/ },
    { id: 'PRF-06', label: 'City, state/region', value: '123 Main St, TX', message: /only a city and state/ },
  ]) {
    test(`${scenario.id}: invalid ${scenario.label} blocks the network save`, async ({ page, mockBackend }) => {
      await editProfile(page)
      await page.getByLabel(scenario.label, { exact: false }).fill(scenario.value)
      await page.getByRole('button', { name: 'Save profile', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText(scenario.message)
      await expect(page.getByRole('alert')).toBeFocused()
      expect(writesFor(mockBackend, 'profiles', 'PATCH')).toHaveLength(0)
    })
  }

  test('PRF-07: another member profile exposes no editor controls (UI boundary only)', async ({ page, mockBackend }) => {
    await page.goto(`/profile/${OTHER_ID}`)
    await expect(page.getByRole('heading', { name: 'Other Member', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit profile', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Manage skills', exact: true })).toHaveCount(0)
    expect(mockBackend.writes).toHaveLength(0)
  })

  for (const mobile of [false, true]) {
    test(`SKL-01-${mobile ? 'mobile' : 'desktop'}: create, edit and delete persist across portfolio navigation`, async ({ page, mockBackend }, testInfo) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 })
      await newSkill(page)
      await page.getByRole('button', { name: 'Save skill', exact: true }).click()
      await savedSkill(page, 'Piano Basics added.')
      await page.reload()
      await expect(skillCard(page, 'Piano Basics')).toBeVisible()
      await page.getByRole('button', { name: 'Edit Piano Basics', exact: true }).click()
      await page.getByLabel('Skill name', { exact: false }).fill('Piano Practice')
      await page.getByRole('button', { name: 'Save changes', exact: true }).click()
      await savedSkill(page, 'Piano Practice updated.')
      await page.getByRole('link', { name: 'View my profile', exact: false }).click()
      await expect(page).toHaveURL(/\/profile$/)
      await expect(page.getByRole('link', { name: 'Manage skills', exact: true })).toBeVisible()
      await expect(skillCard(page, 'Piano Practice')).toBeVisible()
      await expect(skillCard(page, 'Piano Basics')).toHaveCount(0)
      await screenshot(page, testInfo, `updated-skill-on-profile-${mobile ? 'mobile' : 'desktop'}`, skillCard(page, 'Piano Practice'))
      await page.getByRole('link', { name: 'Manage skills', exact: true }).click()
      await page.getByRole('button', { name: 'Remove Piano Practice', exact: true }).click()
      await page.getByRole('button', { name: 'Yes, remove', exact: true }).click()
      await savedSkill(page, 'Piano Practice removed')
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Guitar Basics', exact: true })).toBeVisible()
      await expect(skillCard(page, 'Piano Practice')).toHaveCount(0)
      await page.getByRole('link', { name: 'View my profile', exact: false }).click()
      await expect(page).toHaveURL(/\/profile$/)
      await expect(page.getByRole('link', { name: 'Manage skills', exact: true })).toBeVisible()
      await expect(skillCard(page, 'Guitar Basics')).toBeVisible()
      await expect(skillCard(page, 'Piano Practice')).toHaveCount(0)
      expect(mockBackend.writes.map(write => write.method)).toEqual(['POST', 'PATCH', 'DELETE'])
      expect(mockBackend.writes[1].filters.user_id).toBe(`eq.${OWNER_ID}`)
      expect(mockBackend.writes[2].filters.user_id).toBe(`eq.${OWNER_ID}`)
    })
  }

  for (const editing of [false, true]) {
    test(`SKL-02-${editing ? 'edit' : 'create'}: failed skill save retains input and retry succeeds`, async ({ page, mockBackend }) => {
      if (editing) {
        await page.goto('/skills')
        await page.getByRole('button', { name: 'Edit Guitar Basics', exact: true }).click()
        await page.getByLabel('Skill name', { exact: false }).fill('Piano Basics')
      } else { await newSkill(page) }
      mockBackend.failNext('skills', editing ? 'PATCH' : 'POST')
      const save = page.getByRole('button', { name: editing ? 'Save changes' : 'Save skill', exact: true })
      await save.click()
      await expect(page.getByRole('alert')).toContainText('Unable to save this skill. Your edits are still here')
      await expect(page.getByRole('alert')).toBeFocused()
      await expect(page.getByLabel('Skill name', { exact: false })).toHaveValue('Piano Basics')
      await save.click()
      await savedSkill(page, `Piano Basics ${editing ? 'updated' : 'added'}.`)
      await page.reload()
      await expect(skillCard(page, 'Piano Basics')).toBeVisible()
      expect(writesFor(mockBackend, 'skills', editing ? 'PATCH' : 'POST')).toHaveLength(2)
    })
  }

  test('SKL-03: rejected deletion keeps the skill visible, then retry removes it', async ({ page, mockBackend }, testInfo) => {
    mockBackend.failNext('skills', 'DELETE', { code: '42501', message: 'Permission denied', status: 403 })
    await page.goto('/skills')
    await page.getByRole('button', { name: 'Remove Guitar Basics', exact: true }).click()
    await page.getByRole('button', { name: 'Yes, remove', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Unable to remove this skill')
    await expect(skillCard(page, 'Guitar Basics')).toBeVisible()
    await screenshot(page, testInfo, 'rejected-deletion-keeps-skill')
    await expect(page.getByRole('status').filter({ hasText: 'removed from your portfolio' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Yes, remove', exact: true }).click()
    await savedSkill(page, 'Guitar Basics removed')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'You know something worth sharing', exact: true })).toBeVisible()
    await expect(skillCard(page, 'Guitar Basics')).toHaveCount(0)
    expect(writesFor(mockBackend, 'skills', 'DELETE')).toHaveLength(2)
  })

  test('SKL-04: delayed skill creation disables repeat submission and creates one card', async ({ page, mockBackend }) => {
    await newSkill(page)
    const pending = mockBackend.holdNext('skills', 'POST')
    try {
      await page.getByRole('button', { name: 'Save skill', exact: true }).click()
      await pending.started
      await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled()
      await expect(page.getByLabel('Skill name', { exact: false })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
    } finally { pending.release() }
    await savedSkill(page, 'Piano Basics added.')
    await expect(skillCard(page, 'Piano Basics')).toHaveCount(1)
    expect(writesFor(mockBackend, 'skills', 'POST')).toHaveLength(1)
  })

  for (const scenario of [
    { id: 'SKL-05', label: 'Description', value: 'Email member@example.test for lessons', message: /Remove email addresses/ },
    { id: 'SKL-06', label: 'City, state/region', value: '123 Main St, TX', message: /City, State\/Region/ },
  ]) {
    test(`${scenario.id}: invalid skill ${scenario.label} blocks creation`, async ({ page, mockBackend }) => {
      await newSkill(page)
      await page.getByLabel(scenario.label, { exact: false }).fill(scenario.value)
      await page.getByRole('button', { name: 'Save skill', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText(scenario.message)
      expect(writesFor(mockBackend, 'skills', 'POST')).toHaveLength(0)
    })
  }
})
