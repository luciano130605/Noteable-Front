import { test, expect } from '@playwright/test';

test('la app carga', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page.getByText('Noteable')).toBeVisible();
});