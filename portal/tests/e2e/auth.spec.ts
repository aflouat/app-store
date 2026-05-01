import { test, expect } from '@playwright/test'

const DEMO_CLIENT = { email: 'client1@perform-learn.fr', password: 'demo1234' }
const DEMO_CONSULTANT = { email: 'consultant1@perform-learn.fr', password: 'demo1234' }
const DEMO_ADMIN = { email: 'admin@perform-learn.fr', password: 'demo1234' }

test.describe('Auth — Login credentials', () => {
  test('client credentials → dashboard client', async ({ page }) => {
    await page.goto('/freelancehub/login')
    await page.fill('input[name="email"], input[type="email"]', DEMO_CLIENT.email)
    await page.fill('input[name="password"], input[type="password"]', DEMO_CLIENT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/freelancehub\/client/, { timeout: 10_000 })
    await expect(page.locator('h1, [data-testid="dashboard-title"]').first()).toBeVisible()
  })

  test('consultant credentials → dashboard consultant', async ({ page }) => {
    await page.goto('/freelancehub/login')
    await page.fill('input[name="email"], input[type="email"]', DEMO_CONSULTANT.email)
    await page.fill('input[name="password"], input[type="password"]', DEMO_CONSULTANT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/freelancehub\/consultant/, { timeout: 10_000 })
  })

  test('admin credentials → dashboard admin', async ({ page }) => {
    await page.goto('/freelancehub/login')
    await page.fill('input[name="email"], input[type="email"]', DEMO_ADMIN.email)
    await page.fill('input[name="password"], input[type="password"]', DEMO_ADMIN.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/freelancehub\/admin/, { timeout: 10_000 })
  })

  test('mauvais mot de passe → message d\'erreur visible', async ({ page }) => {
    await page.goto('/freelancehub/login')
    await page.fill('input[name="email"], input[type="email"]', DEMO_CLIENT.email)
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Doit rester sur /login et afficher une erreur
    await expect(page).toHaveURL(/\/freelancehub\/login/, { timeout: 5_000 })
    const error = page.locator('[role="alert"], .error, [data-testid="auth-error"]')
    await expect(error).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Auth — RBAC redirection', () => {
  test('consultant accédant à /client est redirigé vers /consultant', async ({ page }) => {
    // Login consultant
    await page.goto('/freelancehub/login')
    await page.fill('input[name="email"], input[type="email"]', DEMO_CONSULTANT.email)
    await page.fill('input[name="password"], input[type="password"]', DEMO_CONSULTANT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/freelancehub\/consultant/, { timeout: 10_000 })

    // Tenter d'accéder au dashboard client
    await page.goto('/freelancehub/client')
    await expect(page).toHaveURL(/\/freelancehub\/consultant/, { timeout: 5_000 })
  })

  test('visiteur non authentifié → redirigé vers /login', async ({ page }) => {
    await page.goto('/freelancehub/client')
    await expect(page).toHaveURL(/\/freelancehub\/login/, { timeout: 5_000 })
  })
})

test.describe('Auth — Mot de passe oublié', () => {
  test('page de réinitialisation accessible depuis /login', async ({ page }) => {
    await page.goto('/freelancehub/login')
    const forgotLink = page.locator('a:has-text("oublié"), a:has-text("Forgot"), a[href*="forgot"]')
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    await expect(page).toHaveURL(/forgot-password|reset/, { timeout: 5_000 })
  })
})

test.describe('Auth — Inscription', () => {
  test('page d\'inscription accessible et formulaire visible', async ({ page }) => {
    await page.goto('/freelancehub/register')
    await expect(page.locator('form')).toBeVisible()
    // Sélection du rôle
    await expect(page.locator('text=Client, text=Consultant, [value="client"], [value="consultant"]').first()).toBeVisible()
  })
})
