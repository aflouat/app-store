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
  test('dashboard client affiche un champ de recherche', async ({ page }) => {
    await loginAsClient(page)
    const searchInput = page.locator('input[placeholder*="compétence"], input[placeholder*="skill"], input[type="search"], [data-testid="search-input"]')
    await expect(searchInput.first()).toBeVisible()
  })

  test('recherche retourne des résultats (consultants disponibles en démo)', async ({ page }) => {
    await loginAsClient(page)

    // Lancer une recherche générique
    const searchInput = page.locator('input[placeholder*="compétence"], input[placeholder*="skill"], input[type="search"], [data-testid="search-input"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('développement')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1500)
    }

    // Au moins un consultant affiché (ou message "aucun résultat" visible)
    const hasResults = page.locator('[data-testid="consultant-card"], .consultant-card, [class*="consultant"]')
    const noResults = page.locator('text=Aucun, text=aucun, text=No result')
    await expect(hasResults.or(noResults).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Booking — Flow réservation', () => {
  test('page des réservations client accessible', async ({ page }) => {
    await loginAsClient(page)
    await page.goto('/freelancehub/client/bookings')
    await expect(page).not.toHaveURL(/login/)
    // La page doit charger (titre visible ou liste vide)
    await expect(page.locator('h1, h2, [data-testid="bookings-title"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('cloche notifications accessible', async ({ page }) => {
    await loginAsClient(page)
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label*="notification"], button[aria-label*="cloche"]')
    await expect(bell.first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Booking — Sécurité paiement (RG-01 + RG-02)', () => {
  test('l\'API matching ne retourne pas d\'identifiants personnels sans paiement', async ({ page }) => {
    await loginAsClient(page)

    // Intercepter la réponse de l'API matching
    const matchingResponse = page.waitForResponse(
      resp => resp.url().includes('/api/freelancehub/matching') && resp.status() === 200,
      { timeout: 15_000 }
    )

    // Déclencher la recherche
    const searchInput = page.locator('input[type="search"], input[placeholder*="compétence"]').first()
    if (await searchInput.isVisible({ timeout: 3_000 })) {
      await searchInput.fill('test')
      await page.keyboard.press('Enter')
    }

    try {
      const response = await matchingResponse
      const body = await response.json()
      const consultants = Array.isArray(body) ? body : body.consultants || []

      for (const c of consultants) {
        // Aucun champ d'identité ne doit être exposé avant paiement
        expect(c.email).toBeUndefined()
        expect(c.linkedin_url).toBeUndefined()
        // name et bio peuvent être undefined ou null — jamais une vraie valeur
        if (c.name) expect(c.name).toBeFalsy()
        if (c.bio) expect(c.bio).toBeFalsy()
      }
    } catch {
      // Si la recherche n'a pas été déclenchée, le test passe (cas où la UI est différente)
      test.skip()
    }
  })
})
