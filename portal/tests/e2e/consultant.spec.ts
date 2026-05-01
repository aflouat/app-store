import { test, expect, Page } from '@playwright/test'

const DEMO_CONSULTANT = { email: 'consultant1@perform-learn.fr', password: 'demo1234' }

async function loginAsConsultant(page: Page) {
  await page.goto('/freelancehub/login')
  await page.fill('input[name="email"], input[type="email"]', DEMO_CONSULTANT.email)
  await page.fill('input[name="password"], input[type="password"]', DEMO_CONSULTANT.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/freelancehub\/consultant/, { timeout: 10_000 })
}

test.describe('Consultant — Dashboard', () => {
  test('dashboard consultant se charge correctement', async ({ page }) => {
    await loginAsConsultant(page)
    await expect(page.locator('h1, h2, [data-testid="dashboard-title"]').first()).toBeVisible()
    // Pas d'erreur 500
    await expect(page).not.toHaveURL(/error/)
  })

  test('navigation vers les missions visible', async ({ page }) => {
    await loginAsConsultant(page)
    const missionsLink = page.locator('a[href*="bookings"], a:has-text("Missions"), a:has-text("Réservations")')
    await expect(missionsLink.first()).toBeVisible()
  })
})

test.describe('Consultant — Profil', () => {
  test('page profil accessible', async ({ page }) => {
    await loginAsConsultant(page)
    await page.goto('/freelancehub/consultant/profile')
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('form, [data-testid="profile-form"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('champs profil pré-remplis (consultant démo)', async ({ page }) => {
    await loginAsConsultant(page)
    await page.goto('/freelancehub/consultant/profile')
    // Le tarif journalier doit être visible (input non vide)
    const rateInput = page.locator('input[name*="rate"], input[name*="tarif"], input[placeholder*="tarif"], [data-testid="daily-rate"]')
    if (await rateInput.first().isVisible({ timeout: 5_000 })) {
      const value = await rateInput.first().inputValue()
      expect(value).toBeTruthy()
    }
  })
})

test.describe('Consultant — Agenda', () => {
  test('page agenda accessible', async ({ page }) => {
    await loginAsConsultant(page)
    await page.goto('/freelancehub/consultant/agenda')
    await expect(page).not.toHaveURL(/login/)
    // Grille semaine visible
    await expect(page.locator('[data-testid="agenda-grid"], .agenda, table, [class*="agenda"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('la grille agenda contient des créneaux (lundi–dimanche)', async ({ page }) => {
    await loginAsConsultant(page)
    await page.goto('/freelancehub/consultant/agenda')
    // Les jours de la semaine doivent être présents
    await expect(page.locator('text=Lun, text=Lundi, text=Mon').first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Consultant — Gains', () => {
  test('page gains accessible', async ({ page }) => {
    await loginAsConsultant(page)
    await page.goto('/freelancehub/consultant/earnings')
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('h1, h2, [data-testid="earnings-title"]').first()).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Consultant — KYC', () => {
  test('section KYC visible dans le dashboard ou profil', async ({ page }) => {
    await loginAsConsultant(page)
    // KYC peut être dans le dashboard principal ou profil
    const kycSection = page.locator('text=KYC, text=Vérification, [data-testid="kyc-section"]')
    await expect(kycSection.first()).toBeVisible({ timeout: 8_000 })
  })
})
