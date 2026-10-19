import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { io } from 'socket.io-client'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const browserPath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
  cwd: resolve(root, 'server'), env: { ...process.env, NODE_ENV: 'test', PORT: '3100', CHAT_TABLE_LOCK_MS: '2000' }, stdio: 'pipe',
})
const client = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173'], {
  cwd: resolve(root, 'client'), env: { ...process.env, VITE_SOCKET_URL: 'http://127.0.0.1:3100' }, stdio: 'pipe',
})
let browser
let raw
let serverOutput = ''
server.stdout.on('data', (data) => { serverOutput += data.toString() })
server.stderr.on('data', (data) => { serverOutput += data.toString() })

async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(url)).ok) return } catch { /* server is starting */ }
    await new Promise((done) => setTimeout(done, 100))
  }
  throw new Error(`Timed out waiting for ${url}\n${serverOutput}`)
}

function reply(socket, event, payload) {
  return new Promise((done, fail) => {
    socket.timeout(4000).emit(event, payload, (error, result) => error ? fail(error) : done(result))
  })
}

async function rects(page) {
  return page.evaluate(() => {
    const shape = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }
    return { panel: shape('.chat-panel'), footer: shape('.chat-compose'), hint: shape('.chat-compose small') }
  })
}

try {
  await Promise.all([waitFor('http://127.0.0.1:3100/'), waitFor('http://127.0.0.1:5173/')])
  browser = await chromium.launch({ executablePath: browserPath })
  const aContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const bContext = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  await aContext.addInitScript(() => localStorage.setItem('poker-username', 'Alice'))
  await bContext.addInitScript(() => localStorage.setItem('poker-username', 'Bob'))
  const a = await aContext.newPage()
  const b = await bContext.newPage()
  for (const page of [a, b]) await page.route('**/src/hooks/useSocket.ts*', async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response, body: `${await response.text()}\nwindow.__chatTestSocket = sharedSocket;` })
  })
  await Promise.all([a.goto('http://127.0.0.1:5173/lobby?preview'), b.goto('http://127.0.0.1:5173/lobby?preview')])
  await Promise.all([a.waitForFunction(() => window.__chatTestSocket?.connected), b.waitForFunction(() => window.__chatTestSocket?.connected)])
  const create = await a.evaluate(() => new Promise((done) => window.__chatTestSocket.emit('room:create', { name: 'Alice', maxPlayers: 6 }, done)))
  assert.equal(create.ok, true)
  const pin = create.room.pin
  const join = await b.evaluate((pin) => new Promise((done) => window.__chatTestSocket.emit('room:join', { pin, name: 'Bob' }, done)), pin)
  assert.equal(join.ok, true)

  raw = io('http://127.0.0.1:3100')
  await new Promise((done, fail) => { raw.once('connect', done); raw.once('connect_error', fail) })
  assert.equal((await reply(raw, 'room:join', { pin, name: 'RawPlayer' })).ok, true)
  const start = await a.evaluate((pin) => new Promise((done) => window.__chatTestSocket.emit('room:start', { pin }, done)), pin)
  assert.equal(start.ok, true)
  await Promise.all([a.waitForURL('**/play'), b.waitForURL('**/play')])
  await a.locator('.chat-toggle').click()
  await b.locator('.chat-toggle').click()
  const unlockedA = await rects(a)
  const unlockedB = await rects(b)

  await a.getByRole('textbox', { name: 'Message to table' }).fill('First message')
  await a.getByRole('button', { name: 'SEND' }).click()
  assert.equal(await a.getByRole('textbox', { name: 'Message to table' }).evaluate((input) => document.activeElement === input), true)
  await b.locator('.chat-lock-hint').waitFor()
  assert.equal(await a.getByRole('textbox', { name: 'Message to table' }).getAttribute('readonly'), '')
  assert.equal(await b.getByRole('textbox', { name: 'Message to table' }).getAttribute('readonly'), '')
  assert.match(await b.locator('.chat-lock-hint').innerText(), /รอ\s*[12]\s*วิ พิมพ์ต่อ/)
  assert.deepEqual(await rects(a), unlockedA)
  assert.deepEqual(await rects(b), unlockedB)
  const hintFits = await b.locator('.chat-lock-hint').evaluate((hint) => hint.scrollWidth <= hint.clientWidth && hint.scrollHeight <= hint.clientHeight)
  assert.equal(hintFits, true)
  await a.screenshot({ path: resolve(root, 'docs/chat-reference/lock-state-1920x1080.png') })
  await b.screenshot({ path: resolve(root, 'docs/chat-reference/lock-state-1366x768.png') })

  const rejection = new Promise((done) => raw.once('chat:rate_limited', done))
  raw.emit('chat:send', { pin, text: 'Raw bypass attempt' })
  assert.deepEqual((await rejection).reason, 'table_lock')
  assert.equal(await b.getByText('Raw bypass attempt').count(), 0)
  const historyReply = new Promise((done) => raw.once('chat:history', (history, state) => done({ history, state })))
  raw.emit('chat:join', { pin })
  const joined = await historyReply
  assert.equal(joined.history.some((message) => message.text === 'Raw bypass attempt'), false)
  assert.ok(joined.state.remainingMs > 0 && joined.state.remainingMs <= 2000)
  await b.locator('.chat-lock-hint').waitFor({ state: 'hidden', timeout: 5000 })
  await b.getByRole('textbox', { name: 'Message to table' }).fill('After unlock')
  await b.getByRole('button', { name: 'SEND' }).click()
  await a.getByText('After unlock').waitFor()
  await b.evaluate((tableId) => {
    for (const listener of window.__chatTestSocket.listeners('chat:lock')) listener({ tableId, remainingMs: 0 })
  }, pin)
  const bInput = b.getByRole('textbox', { name: 'Message to table' })
  await b.waitForFunction(() => !document.querySelector('.chat-input-row input')?.readOnly)
  await bInput.fill('Restore this draft')
  await b.getByRole('button', { name: 'SEND' }).click()
  await bInput.waitFor()
  await b.waitForFunction(() => document.querySelector('.chat-input-row input')?.value === 'Restore this draft')
  assert.equal(await bInput.getAttribute('readonly'), '')
  await b.locator('.chat-lock-hint').waitFor({ state: 'hidden', timeout: 5000 })

  await b.clock.install()
  await b.evaluate(() => {
    const active = new Set()
    const add = window.setInterval.bind(window)
    const remove = window.clearInterval.bind(window)
    window.__activeChatIntervals = active
    window.setInterval = (callback, ms, ...args) => {
      const id = add(callback, ms, ...args)
      if (ms === 200) active.add(id)
      return id
    }
    window.clearInterval = (id) => { active.delete(id); remove(id) }
  })
  await bInput.fill('fold')
  await bInput.focus()
  await b.evaluate((tableId) => {
    for (const listener of window.__chatTestSocket.listeners('chat:lock')) listener({ tableId, remainingMs: 10_000 })
  }, pin)
  await b.locator('.chat-lock-hint').getByText('10').waitFor()
  assert.equal(await bInput.getAttribute('readonly'), '')
  assert.equal(await bInput.inputValue(), 'fold')
  assert.equal(await bInput.evaluate((input) => document.activeElement === input), true)
  assert.equal(await b.evaluate(() => window.__activeChatIntervals.size), 1)
  await bInput.press('Enter')
  assert.equal(await b.getByText('fold', { exact: true }).count(), 0)
  await b.evaluate(() => {
    const socket = window.__chatTestSocket
    const emit = socket.emit.bind(socket)
    window.__gameActionCount = 0
    socket.emit = (event, ...args) => {
      if (event === 'game:action') window.__gameActionCount += 1
      return emit(event, ...args)
    }
  })
  await b.keyboard.type('fold')
  assert.equal(await b.evaluate(() => window.__gameActionCount), 0)
  assert.equal(await bInput.inputValue(), 'fold')
  await b.clock.runFor(1000)
  assert.match(await b.locator('.chat-lock-hint').innerText(), /รอ\s*9\s*วิ พิมพ์ต่อ/)
  await b.locator('.chat-header button').evaluate((button) => button.click())
  await b.clock.runFor(2000)
  assert.equal(await b.evaluate(() => window.__activeChatIntervals.size), 1)
  await b.locator('.chat-toggle').evaluate((button) => button.click())
  assert.match(await b.locator('.chat-lock-hint').innerText(), /รอ\s*7\s*วิ พิมพ์ต่อ/)
  for (let second = 6; second >= 1; second -= 1) {
    await b.clock.runFor(1000)
    assert.match(await b.locator('.chat-lock-hint').innerText(), new RegExp(`รอ\\s*${second}\\s*วิ พิมพ์ต่อ`))
  }
  await b.clock.runFor(1000)
  await b.waitForFunction(() => !document.querySelector('.chat-input-row input')?.readOnly)
  assert.match(await b.locator('.chat-compose small').innerText(), /PRESS ENTER/)
  assert.equal(await bInput.inputValue(), 'fold')
  assert.equal(await b.evaluate(() => window.__activeChatIntervals.size), 0)
  await b.evaluate((tableId) => {
    for (const listener of window.__chatTestSocket.listeners('chat:lock')) listener({ tableId, remainingMs: 10_000 })
  }, pin)
  await b.locator('.chat-lock-hint').waitFor()
  assert.equal(await b.evaluate(() => window.__activeChatIntervals.size), 1)
  await b.getByRole('button', { name: /LEAVE TABLE/ }).click()
  await b.waitForFunction(() => window.__activeChatIntervals.size === 0)

  const botContext = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const bot = await botContext.newPage()
  await bot.goto('http://127.0.0.1:5173/play?preview')
  await bot.locator('.chat-toggle').click()
  await bot.clock.install()
  const botInput = bot.getByRole('textbox', { name: 'Message to table' })
  await botInput.fill('First local message')
  await botInput.press('Enter')
  assert.equal(await botInput.getAttribute('readonly'), '')
  assert.equal(await botInput.evaluate((input) => document.activeElement === input), true)
  assert.equal(await bot.getByRole('button', { name: 'SEND' }).isDisabled(), true)
  assert.equal(await botInput.getAttribute('placeholder'), 'รอคิวพิมพ์...')
  assert.match(await bot.locator('.chat-lock-hint').innerText(), /รอ\s*10\s*วิ พิมพ์ต่อ/)
  const hintType = await bot.locator('.chat-lock-hint').evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) }
  })
  assert.ok(hintType.fontSize >= 12 && hintType.lineHeight >= hintType.fontSize * 1.5 - 0.1)
  await bot.screenshot({ path: resolve(root, 'docs/chat-reference/lock-state-bot-1366x768.png') })
  await botInput.press('Enter')
  assert.equal(await bot.locator('.chat-message').count(), 1)
  await bot.clock.runFor(10_000)
  await bot.waitForFunction(() => !document.querySelector('.chat-input-row input')?.readOnly)
  await botInput.fill('After local unlock')
  await bot.getByRole('button', { name: 'SEND' }).click()
  await bot.getByText('After local unlock').waitFor()
  console.log('Two-player and bot-table chat lock E2E passed; screenshots saved to docs/chat-reference/')
} finally {
  raw?.disconnect()
  await browser?.close()
  server.kill()
  client.kill()
}
