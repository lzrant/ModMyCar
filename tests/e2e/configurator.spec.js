import { test, expect } from '@playwright/test'
test('catalog selection, paint, save, reload and load restore the build', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Subaru WRX', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('3D model ready')).toBeVisible()
  await page
    .getByRole('button', { name: 'Add RPF1 · 18×8.5 +40', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add Raijin · 18×8.5 +38', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Add RPF1 · 18×8.5 +40', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Add LEGAMAX Premium', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Add PRO-KIT lowering springs', exact: true })
    .click()
  await page.getByRole('button', { name: 'Paint #d7323f', exact: true }).click()
  await page.getByRole('button', { name: 'Save build', exact: false }).click()
  await expect(page.getByText('Build saved to your garage.')).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath('desktop.png'),
    fullPage: true,
  })
  await page.reload()
  await expect(page.getByLabel('Saved builds').locator('option')).toHaveCount(2)
  await page.getByLabel('Saved builds').selectOption({ index: 1 })
  await page
    .getByRole('button', { name: 'Load saved build', exact: true })
    .click()
  await expect(page.getByText('Saved build loaded.')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Paint #d7323f', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', {
      name: 'Remove Raijin · 18×8.5 +38',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Remove LEGAMAX Premium', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Year', { exact: true }).selectOption('2019')
  await page.getByLabel('Make', { exact: true }).selectOption('Toyota')
  await page
    .getByLabel('Model', { exact: true })
    .selectOption({ label: '86 · 2.0L coupe' })
  await expect(
    page.getByRole('heading', { name: 'Toyota 86', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add Hi-Power SPEC-L II', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('0 parts selected')).toBeVisible()
  expect(errors).toEqual([])
})
test('shows loading and visible fallback on glTF 404; remains usable on mobile', async ({
  page,
}) => {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/*.glb', async (route) => {
    await gate
    await route.fulfill({ status: 404, body: 'Not found' })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByText('Loading 3D model…')).toBeVisible()
  release()
  await expect(
    page.getByText(
      'Model could not load. Showing the detailed procedural preview.',
    ),
  ).toBeVisible()
  await page
    .getByRole('button', {
      name: 'Add GTC-300 · 61-inch carbon wing',
      exact: true,
    })
    .click()
  await expect(page.getByText('1 part selected')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: test.info().outputPath('mobile-fallback.png'),
    fullPage: true,
  })
})
test('explains an API outage and can retry', async ({ page }) => {
  await page.route('**/api/vehicles', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Catalog temporarily unavailable.' }),
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText(
    'Catalog temporarily unavailable.',
  )
  await page.unroute('**/api/vehicles')
  await page.getByRole('button', { name: 'Retry connection' }).click()
  await expect(
    page.getByRole('heading', { name: 'Subaru WRX', exact: true }),
  ).toBeVisible()
})
