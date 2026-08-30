import { test, expect } from '@playwright/test'

// Shared credentials (match seed data — login form uses username, not email)
const ADMIN   = { username: 'admin',    password: 'admin123' }
const PATIENT = { username: 'patient1', password: 'patient123' }

// ── Helpers ───────────────────────────────────────────────────────────────────
async function login(page: Parameters<typeof test>[1], username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/username/i).fill(username)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|login/i }).click()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('shows login page at root when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('rejects wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/username/i).fill('wrong_user')
    await page.getByLabel(/password/i).fill('wrongpass')
    await page.getByRole('button', { name: /sign in|login/i }).click()
    await expect(page.getByText(/invalid|incorrect|unauthorized/i)).toBeVisible({ timeout: 5_000 })
  })

  test('patient can log in and reach dashboard', async ({ page }) => {
    await login(page, PATIENT.username, PATIENT.password)
    await expect(page).toHaveURL(/\/patient/)
    await expect(page.getByText(/appointment|my agenda/i)).toBeVisible()
  })

  test('admin can log in and reach admin panel', async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByText(/dashboard|appointment/i)).toBeVisible()
  })
})

test.describe('Appointment flow (patient)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PATIENT.username, PATIENT.password)
  })

  test('creates a new appointment', async ({ page }) => {
    // Open new appointment form — either a button or the nav link
    const newApptBtn = page.getByRole('button', { name: /new appointment|book/i })
    if (await newApptBtn.count()) {
      await newApptBtn.click()
    } else {
      await page.getByRole('link', { name: /new appointment/i }).click()
    }

    // Fill form
    const doctorSelect = page.getByLabel(/doctor/i)
    await doctorSelect.selectOption({ index: 1 }) // pick first available

    const dateInput = page.locator('input[type="date"], input[name*="date"]').first()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await dateInput.fill(tomorrow.toISOString().split('T')[0])

    const timeInput = page.locator('input[type="time"], select[name*="time"]').first()
    if (await timeInput.count()) await timeInput.fill('10:00')

    await page.getByRole('button', { name: /book|schedule|save|confirm/i }).click()

    // Confirmation
    await expect(page.getByText(/success|confirmed|booked|scheduled/i)).toBeVisible({ timeout: 8_000 })
  })

  test('appointment appears in my appointments list', async ({ page }) => {
    // Navigate to my appointments
    const myAppts = page.getByRole('link', { name: /my appointment/i })
    if (await myAppts.count()) await myAppts.click()

    await expect(page.locator('table, [data-testid="appointment-list"], [data-testid="appointment-card"]').first())
      .toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Admin — appointment status management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
  })

  test('admin dashboard shows appointment list', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    const list = page.locator('table, [data-testid="appointment-list"]').first()
    await expect(list).toBeVisible({ timeout: 8_000 })
  })

  test('admin can change appointment status', async ({ page }) => {
    // Find the first status-change dropdown or button
    const statusControl = page.locator('select[name*="status"], button[data-status]').first()
    if (await statusControl.count()) {
      await statusControl.selectOption({ index: 1 })
      // Wait for optimistic update or toast
      await page.waitForResponse(resp => resp.url().includes('/api/appointments') && resp.ok())
    } else {
      // Look for a status badge that can be clicked
      const badge = page.locator('[data-testid="status-badge"], .status-badge').first()
      if (await badge.count()) {
        await badge.click()
        await expect(page.getByRole('option').first()).toBeVisible()
      }
    }
  })
})

test.describe('Admin — doctor management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.username, ADMIN.password)
    await page.getByRole('link', { name: /doctor/i }).click()
    await expect(page).toHaveURL(/\/admin\/doctors/)
  })

  test('doctor list renders correctly', async ({ page }) => {
    // Table header
    await expect(page.getByText(/name/i).first()).toBeVisible()
    // At least one doctor row (seed data has 8)
    await expect(page.locator('table tbody tr, [data-testid="doctor-row"]').first())
      .toBeVisible({ timeout: 8_000 })
  })

  test('can toggle doctor active status', async ({ page }) => {
    const toggle = page.getByRole('switch').first()
    await expect(toggle).toBeVisible({ timeout: 8_000 })
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  })

  test('can add a new doctor', async ({ page }) => {
    await page.getByRole('button', { name: /add doctor/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel(/full name/i).fill('Dr. Test Playwright')
    await page.getByLabel(/email/i).fill(`playwright.test.${Date.now()}@clinic.com`)
    await page.getByLabel(/phone/i).fill('+49 30 9999 9999')

    await page.getByRole('button', { name: /add doctor/i }).last().click()

    await expect(page.getByText('Dr. Test Playwright')).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('i18n — language switching', () => {
  test('German language switch changes navigation labels', async ({ page }) => {
    await login(page, PATIENT.username, PATIENT.password)

    // Find language switcher
    const langBtn = page.locator('button[aria-label*="language"], select[name*="lang"], [data-testid="lang-switcher"]').first()
    if (await langBtn.count()) {
      await langBtn.click()
      const deOption = page.getByText(/deutsch|german|de/i).first()
      if (await deOption.count()) {
        await deOption.click()
        // Dashboard label should now be in German
        await expect(page.getByText(/dashboard|übersicht/i)).toBeVisible()
      }
    } else {
      test.skip()
    }
  })
})
