import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';

// A 10 × 10 PNG: 64 white border cells, 18 red cells, and 18 blue cells.
const fixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIElEQVR4nGP4TyRgIFnhBxEROBbReAbHw1sh0cFDCAAA7f5LAGQ3dVgAAAAASUVORK5CYII=',
  'base64',
);
const upload = (page: Page) => page.locator('input[type="file"][accept*="image/jpeg"]');
const preview = (page: Page) => page.locator('canvas:visible');
const total = (page: Page) => page.getByText(/总计: \d+ 颗/);
const canvasImage = (page: Page) => preview(page).evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
const pageErrors = new Map<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page), 'Uncaught browser errors').toEqual([]);
  pageErrors.delete(page);
});

async function openApp(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '留在此页', exact: true }).click();
}

async function convertImage(page: Page) {
  await upload(page).setInputFiles({ name: 'pattern.png', mimeType: 'image/png', buffer: fixture });
  await expect(page.getByRole('button', { name: '下载拼豆图纸', exact: true })).toBeEnabled();
  await page.locator('#granularityInput').fill('10');
  await page.locator('#similarityThresholdInput').fill('0');
  await page.getByRole('button', { name: '应用数字', exact: true }).click();
  await expect(total(page)).toContainText('总计: 100 颗');
  await expect(preview(page)).toHaveAttribute('width', '500');
}

async function downloadBytes(download: Download) {
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

async function exportPattern(page: Page) {
  await page.getByRole('button', { name: '下载拼豆图纸', exact: true }).click();
  await page.getByText('同时导出源数据', { exact: true })
    .locator('../..').locator('input[type="checkbox"]').check({ force: true });
  const pngPromise = page.waitForEvent('download', download => download.suggestedFilename().endsWith('.png'));
  const csvPromise = page.waitForEvent('download', download => download.suggestedFilename().endsWith('.csv'));
  await page.getByRole('button', { name: '下载图纸', exact: true }).click();
  const [png, csv] = await Promise.all([pngPromise, csvPromise]);
  expect(png.suggestedFilename()).toContain('10x10');
  expect(csv.suggestedFilename()).toContain('10x10');
  const [pngBytes, csvBytes] = await Promise.all([downloadBytes(png), downloadBytes(csv)]);
  expect(pngBytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(pngBytes.readUInt32BE(16)).toBeGreaterThan(10);
  expect(pngBytes.readUInt32BE(20)).toBeGreaterThan(10);
  return csvBytes;
}

test('converts an image and restores background removal and manual edits', async ({ page }) => {
  await openApp(page);
  await convertImage(page);
  const original = await canvasImage(page);

  await page.getByRole('button', { name: '一键去背景', exact: true }).click();
  await expect(total(page)).toContainText('总计: 36 颗');
  await expect.poll(() => canvasImage(page)).not.toBe(original);
  await page.getByRole('button', { name: '回撤上一步', exact: true }).click();
  await expect(total(page)).toContainText('总计: 100 颗');
  await expect.poll(() => canvasImage(page)).toBe(original);

  await page.getByRole('button', { name: '进入手动编辑模式', exact: true }).click();
  await expect(page.getByTitle('撤回上一步', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
  await page.getByTitle('关闭调色盘', { exact: true }).first().click();
  await preview(page).click({ position: { x: 175, y: 175 } });
  await page.getByTitle('打开调色盘', { exact: true }).click();
  await expect(page.getByTitle('撤回上一步', { exact: true })).toBeEnabled();
  await expect.poll(() => canvasImage(page)).not.toBe(original);
  await page.getByTitle('撤回上一步', { exact: true }).click();
  await expect.poll(() => canvasImage(page)).toBe(original);
  await expect(page.getByTitle('撤回上一步', { exact: true })).toBeDisabled();
  await page.getByTitle('退出手动编辑模式', { exact: true }).click();
  await expect(total(page)).toContainText('总计: 100 颗');
});

test('exports PNG and CSV and preserves the pattern after CSV reimport', async ({ page }) => {
  await openApp(page);
  await convertImage(page);
  const csv = await exportPattern(page);
  const cells = csv.toString('utf8').trim().split('\n').map(row => row.split(','));
  expect(cells).toHaveLength(10);
  expect(cells.every(row => row.length === 10)).toBe(true);
  expect(cells.flat().every(color => /^#[0-9A-F]{6}$/i.test(color))).toBe(true);
  expect(new Set(cells.flat()).size).toBe(3);

  const dialogPromise = page.waitForEvent('dialog');
  await upload(page).setInputFiles({ name: 'round-trip.csv', mimeType: 'text/csv', buffer: csv });
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('成功导入CSV文件');
  await dialog.accept();
  await expect(total(page)).toContainText('总计: 100 颗');
  expect(await exportPattern(page)).toEqual(csv);
});

test('opens the generated pattern in focus mode', async ({ page }) => {
  await openApp(page);
  await convertImage(page);
  await page.getByRole('button', { name: '进入专心拼豆模式（AplhaTest）', exact: true }).click();
  await page.getByRole('button', { name: '直接进入（不下载）', exact: true }).click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByRole('heading', { name: '专心拼豆（AlphaTest）' })).toBeVisible();
  await expect(preview(page)).toHaveAttribute('width', '300');
  await page.getByRole('button', { name: '颜色', exact: true }).click();
  await expect(page.getByPlaceholder('搜索颜色...')).toBeVisible();
});

test('optimizes the donation QR image through the Next.js image endpoint', async ({ page, request }) => {
  const response = await request.get('/_next/image?url=%2Fdonation-qr.jpg&w=256&q=75');
  expect(response.status()).toBe(200);
  const contentType = response.headers()['content-type'];
  expect(contentType).toMatch(/^image\//);
  const bytes = await response.body();
  expect(bytes.length).toBeGreaterThan(0);
  const dimensions = await page.evaluate(async ({ contentType, base64 }) => {
    const image = new Image();
    image.src = `data:${contentType};base64,${base64}`;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, { contentType, base64: bytes.toString('base64') });
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
});

test('serves the app and converts a local image offline through its production service worker', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')).toContain('/sw.js');
  const workerURL = await page.evaluate(() => navigator.serviceWorker.controller!.scriptURL);
  await page.reload();
  await page.getByRole('button', { name: '留在此页', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(workerURL);
  const manifest = await page.evaluate(async () => (await fetch('/manifest.json')).json());
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons.length).toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '留在此页', exact: true }).click();
  await convertImage(page);
  await expect(page.getByRole('button', { name: '下载拼豆图纸', exact: true })).toBeEnabled();
});

test('keeps RSC and HTML responses distinct offline and reopens a visited focus page', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || '')).toContain('/sw.js');
  await convertImage(page);
  await page.getByRole('button', { name: '进入专心拼豆模式（AplhaTest）', exact: true }).click();
  await page.getByRole('button', { name: '直接进入（不下载）', exact: true }).click();
  await expect(page.getByRole('heading', { name: '专心拼豆（AlphaTest）' })).toBeVisible();
  await openApp(page);

  const fetchRepresentations = () => page.evaluate(async () => {
    // Reuse the RSC URL for HTML too, so distinct query strings cannot hide a cache collision.
    const requests = [
      new Request('/?_rsc=dependency-check', { headers: { RSC: '1' } }),
      new Request('/?_rsc=dependency-check'),
      new Request('/'),
    ];
    const responses = [];
    for (const request of requests) {
      const response = await fetch(request);
      responses.push({
        status: response.status,
        contentType: response.headers.get('content-type'),
        nonempty: (await response.text()).length > 0,
      });
    }
    return responses;
  });
  const expected = [
    { status: 200, contentType: expect.stringContaining('text/x-component'), nonempty: true },
    { status: 200, contentType: expect.stringContaining('text/html'), nonempty: true },
    { status: 200, contentType: expect.stringContaining('text/html'), nonempty: true },
  ];
  expect(await fetchRepresentations()).toEqual(expected);
  await context.setOffline(true);
  expect(await fetchRepresentations()).toEqual(expected);
  await page.goto('/focus');
  await expect(page.getByRole('heading', { name: '专心拼豆（AlphaTest）' })).toBeVisible();
  await expect(preview(page)).toHaveAttribute('width', '300');
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('uploads and generates a pattern on a narrow touch viewport', async ({ page }) => {
    await openApp(page);
    await convertImage(page);
    await page.getByRole('button', { name: '下载拼豆图纸', exact: true }).tap();
    await expect(page.getByRole('heading', { name: '下载图纸设置' })).toBeVisible();
  });
});
