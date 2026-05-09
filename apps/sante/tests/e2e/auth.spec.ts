import { test, expect } from '@playwright/test'

const uniqueEmail = () => `test+${Date.now()}@example.com`

test.describe('Inscription — flux complet', () => {
  test('inscription patient → redirection /patient/dashboard', async ({ page }) => {
    const email = uniqueEmail()
    await page.goto('/register')

    await page.locator('.sa-reg-panel').nth(0).click()
    await page.fill('#name',     'Test Patient')
    await page.fill('#email',    email)
    await page.fill('#password', 'motdepasse123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/patient/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL('/patient/dashboard')
  })

  test('inscription médecin → redirection /doctor/dashboard', async ({ page }) => {
    const email = uniqueEmail()
    await page.goto('/register')

    await page.locator('.sa-reg-panel').nth(1).click()
    await page.fill('#name',     'Dr Test Médecin')
    await page.fill('#email',    email)
    await page.fill('#password', 'motdepasse123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/doctor/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL('/doctor/dashboard')
  })

  test('email déjà utilisé → message d\'erreur', async ({ page }) => {
    const email = uniqueEmail()
    await page.goto('/register')

    await page.locator('.sa-reg-panel').nth(0).click()
    await page.fill('#name',     'Test Doublon')
    await page.fill('#email',    email)
    await page.fill('#password', 'motdepasse123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/patient/dashboard', { timeout: 15_000 })

    await page.goto('/register')
    await page.locator('.sa-reg-panel').nth(0).click()
    await page.fill('#email',    email)
    await page.fill('#password', 'autremotdepasse')
    await page.click('button[type="submit"]')

    await expect(page.locator('.sa-reg-error')).toBeVisible()
    await expect(page.locator('.sa-reg-error')).toContainText('existe déjà')
  })

  test('mot de passe trop court → pas de soumission', async ({ page }) => {
    await page.goto('/register')
    await page.locator('.sa-reg-panel').nth(0).click()
    await page.fill('#email',    uniqueEmail())
    await page.fill('#password', 'court')

    const btn = page.locator('button[type="submit"]')
    await expect(btn).toBeVisible()
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/register')
  })
})

test.describe('Connexion — flux complet', () => {
  test('connexion patient valide → /patient/dashboard', async ({ page }) => {
    const email = uniqueEmail()

    await page.goto('/register')
    await page.locator('.sa-reg-panel').nth(0).click()
    await page.fill('#name',     'Login Test Patient')
    await page.fill('#email',    email)
    await page.fill('#password', 'motdepasse123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/patient/dashboard', { timeout: 15_000 })

    await page.goto('/login')
    await page.fill('#email',    email)
    await page.fill('#password', 'motdepasse123')
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/(patient|doctor|admin)/, { timeout: 15_000 })
    await expect(page).toHaveURL('/patient/dashboard')
  })

  test('mauvais mot de passe → message d\'erreur', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email',    'inconnu@example.com')
    await page.fill('#password', 'mauvaismdp')
    await page.click('button[type="submit"]')

    await expect(page.locator('.sa-login-error')).toBeVisible()
    await expect(page.locator('.sa-login-error')).toContainText('incorrect')
  })

  test('redirection /api/auth/error absente — les erreurs vont vers /login', async ({ page }) => {
    await page.goto('/api/auth/error')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('RBAC — accès protégé', () => {
  test('utilisateur non authentifié → redirection /login', async ({ page }) => {
    await page.goto('/doctor/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('utilisateur non authentifié vers /patient/dashboard → /login', async ({ page }) => {
    await page.goto('/patient/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
