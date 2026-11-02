import { writeFile } from 'node:fs/promises'

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0'
const { chromium } = await import('@playwright/test')

const baseUrl = process.env.CHAT_URL ?? 'http://127.0.0.1:5178'
const viewports = [
  [1280, 720], [1366, 768], [1536, 864], [1707, 960],
  [1920, 1080], [2560, 1440], [3413, 1920],
]
const browser = await chromium.launch()
const results = []
const collapsedResults = []
const emojiInsertionChecks = []

for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/play?preview&chatDemo=expanded`, { waitUntil: 'domcontentloaded' })
  await page.locator('.chat-panel').waitFor({ state: 'visible', timeout: 15000 })
  await page.screenshot({ path: `docs/chat-reference/chat-layout-${width}x${height}.png` })
  results.push(await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null
      const { x, y, width, height, top, right, bottom, left } = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { x, y, width, height, top, right, bottom, left, fontSize: style.fontSize, fontFamily: style.fontFamily }
    }
    const selectors = [
      '.playroom-header', '.table-area', '.poker-table', '.community-cards', '.pot-info',
      '.player-seat', '.seat-info', '.seat-action', '.opponent-cards', '.action-bar',
      '.hole-cards', '.action-buttons', '.raise-slider-container', '.chat-panel',
      '.chat-header', '.chat-list', '.chat-compose',
    ]
    const elements = Object.fromEntries(selectors.map((selector) => [
      selector,
      [...document.querySelectorAll(selector)].map(rect),
    ]))
    const table = document.querySelector('.poker-table')?.getBoundingClientRect()
    const chat = document.querySelector('.chat-panel')?.getBoundingClientRect()
    const stage = document.querySelector('.table-area')?.getBoundingClientRect()
    const action = document.querySelector('.action-bar')?.getBoundingClientRect()
    const chatScale = Number.parseFloat(getComputedStyle(document.querySelector('.table-chat')).getPropertyValue('--u'))
    const intersections = [...document.querySelectorAll('[data-chat-keepclear]')].flatMap((element) => {
      const candidate = element.getBoundingClientRect()
      return chat && candidate.width && candidate.height && candidate.left < chat.right && candidate.right > chat.left && candidate.top < chat.bottom && candidate.bottom > chat.top
        ? [{ selector: element.className?.baseVal || element.className || element.tagName, rect: rect(element) }]
        : []
    })
    return {
      viewport: { width: innerWidth, height: innerHeight },
      stage: rect(document.querySelector('.table-area')),
      table: rect(document.querySelector('.poker-table')),
      header: rect(document.querySelector('.playroom-header')),
      actionBar: rect(document.querySelector('.action-bar')),
      chat: rect(document.querySelector('.chat-panel')),
      chatFonts: {
        header: getComputedStyle(document.querySelector('.chat-header')).fontSize,
        message: getComputedStyle(document.querySelector('.chat-message')).fontSize,
        input: getComputedStyle(document.querySelector('.chat-input-row input')).fontSize,
      },
      chatScale,
      ownMessage: {
        text: document.querySelector('.chat-message.mine .chat-text')?.textContent,
        sender: document.querySelector('.chat-message.mine .chat-sender')?.textContent,
        hasBall: Boolean(document.querySelector('.own-eight-ball')),
        hasBubble: Boolean(document.querySelector('.chat-own-bubble')),
        hasEmojiPicker: Boolean(document.querySelector('.chat-emoji-toggle')),
      },
      tableScale: table ? table.width / 1050 : null,
      freeHeight: stage && action ? action.top - stage.top : null,
      intersectsKeepClear: intersections,
      elements,
    }
  }))
  const result = results.at(-1)
  if (result.chat.left < 0 || result.chat.top < 0 || result.chat.right > width || result.chat.bottom > height) {
    throw new Error(`Chat escaped the viewport at ${width}x${height}`)
  }
  if (result.chat.bottom > result.actionBar.top || result.chat.top < result.header.bottom) {
    throw new Error(`Expanded chat violates header/action-bar bounds at ${width}x${height}`)
  }
  if (result.chatScale < 0.5 || result.chatScale > 1.25) {
    throw new Error(`Chat scale is outside bounds at ${width}x${height}: ${result.chatScale}`)
  }
  if (result.ownMessage.sender !== ': JORCH' || result.ownMessage.hasBall || result.ownMessage.hasBubble || !result.ownMessage.hasEmojiPicker) {
    throw new Error(`Own-message layout does not match the specification at ${width}x${height}: ${JSON.stringify(result.ownMessage)}`)
  }
  const input = page.locator('.chat-input-row input')
  await input.fill('abc')
  await input.evaluate((element) => { element.setSelectionRange(1, 1); element.dispatchEvent(new Event('select', { bubbles: true })) })
  await page.locator('.chat-emoji-toggle').click()
  if (width === 1366 && height === 768) await page.screenshot({ path: 'docs/chat-reference/chat-emoji-picker-1366x768.png' })
  await page.locator('.chat-emoji-choice').first().click()
  const insertedText = await input.inputValue()
  const characterCount = await page.locator('.chat-compose small b').textContent()
  if (insertedText !== 'a😎bc' || characterCount !== '4/120') {
    throw new Error(`Emoji picker result at ${width}x${height}: text=${JSON.stringify(insertedText)}, count=${JSON.stringify(characterCount)}`)
  }
  emojiInsertionChecks.push({ viewport: { width, height }, insertedText, characterCount })
  await page.close()

  const collapsedPage = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await collapsedPage.goto(`${baseUrl}/play?preview&chatDemo=collapsed`, { waitUntil: 'domcontentloaded' })
  const toggle = collapsedPage.locator('.chat-collapsed-row')
  await toggle.waitFor({ state: 'visible', timeout: 15000 })
  await collapsedPage.screenshot({ path: `docs/chat-reference/chat-collapsed-layout-${width}x${height}.png` })
  const collapsed = await toggle.boundingBox()
  const actionTop = await collapsedPage.locator('.action-bar').evaluate((element) => element.getBoundingClientRect().top)
  if (!collapsed || collapsed.x < 0 || collapsed.y < 0 || collapsed.x + collapsed.width > width || collapsed.y + collapsed.height > actionTop) {
    throw new Error(`Collapsed chat escapes its safe area at ${width}x${height}`)
  }
  collapsedResults.push({ viewport: { width, height }, chat: collapsed, actionTop })
  await collapsedPage.close()
}

await browser.close()
const report = { expanded: results, collapsed: collapsedResults, emojiInsertion: emojiInsertionChecks }
await writeFile('docs/chat-reference/layout-audit-after.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(`Audited ${results.length} expanded and ${collapsedResults.length} collapsed viewports. Report: docs/chat-reference/layout-audit-after.json`)
