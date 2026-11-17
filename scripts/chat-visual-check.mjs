import { readFile } from 'node:fs/promises'

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0'
const { chromium } = await import('@playwright/test')

const baseUrl = process.env.CHAT_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

for (const state of ['expanded', 'collapsed']) {
  await page.goto(`${baseUrl}/play?preview&chatDemo=${state}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(250)
  if (errors.length) throw new Error(errors.join('\n'))
  const target = page.locator(state === 'expanded' ? '.chat-panel' : '.chat-collapsed-row')
  await page.screenshot({ path: `docs/chat-reference/render-page-${state}.png` })
  if (await target.count() !== 1) throw new Error(`Fixture did not render: ${(await page.locator('body').innerText()).slice(0, 500)}`)
  await target.screenshot({ path: `docs/chat-reference/render-${state}.png` })
  const [reference, rendered] = await Promise.all([
    readFile(`docs/chat-reference/chat-${state}.png`),
    readFile(`docs/chat-reference/render-${state}.png`),
  ])
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.setContent(`<style>body{margin:0;background:#17151d;display:flex;gap:16px;padding:16px;align-items:flex-start}img{image-rendering:pixelated;max-width:calc(50vw - 24px);height:auto}</style><img src="data:image/png;base64,${reference.toString('base64')}"><img src="data:image/png;base64,${rendered.toString('base64')}">`)
  await page.screenshot({ path: `docs/chat-reference/compare-${state}.png`, fullPage: true })
}

await browser.close()
