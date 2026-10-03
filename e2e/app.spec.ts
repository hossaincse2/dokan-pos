import { test, expect } from '@playwright/test';

test.describe('POS Application E2E Tests', () => {
  test('should complete login flow', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for login page
    await expect(page.locator('text=Karbar POS')).toBeVisible();
    await expect(page.locator('text=Sign in to your account')).toBeVisible();

    // Fill login form
    await page.fill('input[type="text"]', 'superadmin@gmail.com');
    await page.fill('input[type="password"]', 'password');

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Wait for navigation to POS page
    await expect(page.locator('text=Cart')).toBeVisible({ timeout: 10000 });
  });

  test('should search for products', async ({ page }) => {
    // Assuming already logged in
    await page.goto('http://localhost:5173/pos');

    // Wait for products to load
    await expect(page.locator('input[placeholder*="Search products"]')).toBeVisible();

    // Search for a product
    await page.fill('input[placeholder*="Search products"]', 'shirt');
    await page.waitForTimeout(500); // Debounce

    // Check that search results appear
    await expect(page.locator('.grid').first()).toBeVisible();
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('http://localhost:5173/pos');

    // Wait for products grid
    await expect(page.locator('.grid').first()).toBeVisible();

    // Click on first product
    const firstProduct = page.locator('.border.rounded-lg.p-4').first();
    await firstProduct.click();

    // Verify cart has items
    await expect(page.locator('text=Cart is empty')).not.toBeVisible();
  });

  test('should complete checkout', async ({ page }) => {
    await page.goto('http://localhost:5173/pos');

    // Add a product
    const firstProduct = page.locator('.border.rounded-lg.p-4').first();
    await firstProduct.click();

    // Wait for cart to update
    await page.waitForTimeout(500);

    // Click checkout
    await page.click('button:has-text("Checkout")');

    // Wait for success message
    await expect(page.locator('text=Order created successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('http://localhost:5173/pos');

    // Click orders link
    await page.click('a:has-text("Orders")');

    // Verify orders page loaded
    await expect(page.locator('h1:has-text("Orders")')).toBeVisible();
    await expect(page.locator('button:has-text("All")')).toBeVisible();
  });

  test('should open settings page', async ({ page }) => {
    await page.goto('http://localhost:5173/pos');

    // Click settings link
    await page.click('a:has-text("Settings")');

    // Verify settings page loaded
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    await expect(page.locator('text=Store Settings')).toBeVisible();
  });

  test('should trigger manual sync', async ({ page }) => {
    await page.goto('http://localhost:5173/pos');

    // Click sync button
    await page.click('button:has-text("Sync")');

    // Wait for sync to start
    await expect(page.locator('button:has-text("Syncing...")')).toBeVisible({ timeout: 2000 });

    // Wait for sync to complete
    await expect(page.locator('button:has-text("Sync")')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Authentication Tests', () => {
  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173');

    await page.fill('input[type="text"]', 'invalid@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Should show error message
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('http://localhost:5173/pos');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });
});
