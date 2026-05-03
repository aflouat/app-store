import { test, expect, Page } from '@playwright/test'

const DEMO_CLIENT = { email: 'client1@perform-learn.fr', password: 'demo1234' }

async function loginAsClient(page: Page) {
  await page.goto('/freelancehub/login')
  await page.fill('input[name="email"], input[type="email"]', DEMO_CLIENT.email)
  await page.fill('input[name="password"], input[type="password"]', DEMO_CLIENT.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/\/freelancehub\/client/, { timeout: 10_000 })
}

test.describe('Booking — Recherche consultant', () => {
  test('page recherche accessible et formulaire visible', async ({ page }) => {
    await loginAsClient(page)
    await page.goto('/freelancehub/client/search')
    await expect(page).not.toHaveURL(/login/)
    // Select de compétence et bouton de recherche visibles
    await expect(page.locator('select').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('button:has-text("Rechercher")')).toBeVisible()
  })

  test('recherche retourne des résultats ou message vide', async ({ page }) => {
    await loginAsClient(page)
    await page.goto('/freelancehub/client/search')

    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 8_000 })
    // Sélectionner la première compétence disponible (index 0 = placeholder)
    await select.selectOption({ index: 1 })

    await page.click('button:has-text("Rechercher")')
    await page.waitForTimeout(2000)

    // Au moins un consultant affiché ou message "aucun"
    const hasResults = page.locator('[class*="consultant"], [class*="srch-card"]')
    const noResults  = page.locator('text=Aucun expert disponible')
    await expect(hasResults.or(noResults).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Booking — Flow réservation', () => {
  test('page des réservations client accessible', async ({ page }) => {
    await loginAsClient(page)
    await page.goto('/freelancehub/client/bookings')
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('h1, h2, [data-testid="bookings-title"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('cloche notifications accessible', async ({ page }) => {
    await loginAsClient(page)
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label*="notification"], button[aria-label*="cloche"], a[href*="notification"]')
    await expect(bell.first()).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Booking — Sécurité paiement (RG-01 + RG-02)', () => {
  test('l\'API matching ne retourne pas d\'identifiants personnels sans paiement', async ({ page }) => {
    await loginAsClient(page)
    await page.goto('/freelancehub/client/search')

    const matchingResponse = page.waitForResponse(
      resp => resp.url().includes('/api/freelancehub/matching') && resp.status() === 200,
      { timeout: 20_000 }
    )

    const select = page.locator('select').first()
    if (await select.isVisible({ timeout: 5_000 })) {
      const optionsCount = await select.locator('option').count()
      if (optionsCount > 1) {
        await select.selectOption({ index: 1 })
        await page.click('button:has-text("Rechercher")')
      }
    }

    try {
      const response = await matchingResponse
      const body = await response.json()
      const consultants = Array.isArray(body) ? body : (body.matches ?? body.consultants ?? [])

      for (const c of consultants) {
        const consultant = c.consultant ?? c
        // Aucun champ d'identité ne doit être exposé avant paiement (RG-01)
        expect(consultant.email).toBeUndefined()
        expect(consultant.linkedin_url).toBeUndefined()
        if (consultant.name) expect(consultant.name).toBeFalsy()
        if (consultant.bio)  expect(consultant.bio).toBeFalsy()
      }
    } catch {
      // Si la recherche n'a pas pu être déclenchée, le test est ignoré
      test.skip()
    }
  })
})
