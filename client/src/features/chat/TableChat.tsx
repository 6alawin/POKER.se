import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { Socket } from 'socket.io-client'
import { CHAT_MAX_LENGTH, countCodePoints, nextUnreadCount } from './chatState'
import { chatFixtureMessages } from './chatFixtures'
import chatConfig from '../../../../shared/chat_config.json'
import './table-chat.css'

export type ChatMessage = { id: string; tableId: string; senderId: string; senderName: string; avatarId: string; text: string; ts: number; type: 'chat' }
export type ChatParticipant = { id: string; name: string; avatar: string; isBot?: boolean }

type Props = { tableId: string; myId: string; participants: ChatParticipant[]; socket?: Socket; spectator?: boolean; demo?: 'expanded' | 'collapsed' }

const nameColors = ['#f5b82e', '#ff6e9f', '#f29f38', '#8fe59b', '#c99bff']
const sessionKey = (tableId: string) => `poker:chat:${tableId}:expanded`
const CHAT_BASE_WIDTH = 265
const CHAT_BASE_HEIGHT = 285
const CHAT_EXPANDED_WIDTH = 728
const CHAT_EXPANDED_HEIGHT = 818
const CHAT_MIN_SCALE = 0.75
const CHAT_MAX_SCALE = 1.25
const CHAT_EMOJIS = ['😎', '😄', '😂', '❤️', '👍', '✨', '🔥', '🎉', '🙏', '😭', '😉', '🃏']

function colorFor(id: string) {
  let total = 0
  for (const char of id) total += char.charCodeAt(0)
  return nameColors[total % nameColors.length]
}

function BubbleIcon() { return <span className="chat-bubble-icon" aria-hidden="true"><i /><i /></span> }

export default function TableChat({ tableId, myId, participants, socket, spectator = false, demo }: Props) {
  const fixture = Boolean(demo)
  const [expanded, setExpanded] = useState(() => demo ? demo === 'expanded' : sessionStorage.getItem(sessionKey(tableId)) === 'true')
  const [messages, setMessages] = useState<ChatMessage[]>(fixture ? chatFixtureMessages : [])
  const [text, setText] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [unread, setUnread] = useState(demo === 'collapsed' ? 3 : 0)
  const [cooldown, setCooldown] = useState(0)
  const [lockRemainingMs, setLockRemainingMs] = useState(0)
  const lockDeadlineRef = useRef(0)
  const lockDurationRef = useRef(chatConfig.CHAT_TABLE_LOCK_MS)
  const pendingTextRef = useRef('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const cursorPositionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const tickerTimer = useRef<number | undefined>(undefined)
  const expandedRef = useRef(expanded)
  const manualOpenRef = useRef(false)
  const stickToBottomRef = useRef(true)
  const [layout, setLayout] = useState<{ scale: number; left: number | null; right: number; bottom: number; height: number; fits: boolean; expandedScale: number; expandedHeight: number; expandedFits: boolean } | null>(null)
  const [debugRects, setDebugRects] = useState<Array<{ left: number; top: number; width: number; height: number; label: string }>>([])
  const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).get('chatDebug') === '1'
  const [ticker, setTicker] = useState<ChatMessage | null>(fixture && demo === 'collapsed' ? chatFixtureMessages[2] : null)
  const people = useMemo(() => new Map(participants.map((person) => [person.id, person])), [participants])

  useEffect(() => { expandedRef.current = expanded }, [expanded])

  const applyLock = useCallback((remainingMs: number) => {
    const remaining = Math.max(0, remainingMs)
    lockDeadlineRef.current = performance.now() + remaining
    setLockRemainingMs(remaining)
  }, [])

  useEffect(() => {
    if (lockRemainingMs <= 0) return
    const timer = window.setInterval(() => {
      setLockRemainingMs(Math.max(0, lockDeadlineRef.current - performance.now()))
    }, 200)
    return () => window.clearInterval(timer)
  }, [lockRemainingMs > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!emojiPickerOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) setEmojiPickerOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEmojiPickerOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [emojiPickerOpen])

  const measureLayout = useCallback(() => {
    const stage = document.querySelector<HTMLElement>('.table-area')
    const table = document.querySelector<HTMLElement>('.poker-table')
    const actionBar = document.querySelector<HTMLElement>('.action-bar')
    if (!stage || !table || !actionBar) return

    const stageRect = stage.getBoundingClientRect()
    const tableRect = table.getBoundingClientRect()
    const actionRect = actionBar.getBoundingClientRect()
    const gap = 12
    const freeHeight = Math.max(0, actionRect.top - stageRect.top - gap * 2)
    const tableScale = tableRect.width / 1050
    const expandedScale = Math.min(CHAT_MAX_SCALE, tableScale, (window.innerWidth - gap * 2) / CHAT_EXPANDED_WIDTH, freeHeight / CHAT_EXPANDED_HEIGHT)
    const expandedFits = expandedScale >= 0.5
    const expandedHeight = Math.min(CHAT_EXPANDED_HEIGHT * Math.max(0, expandedScale), freeHeight)
    const maxScale = Math.min(CHAT_MAX_SCALE, tableScale, (window.innerWidth - gap * 2) / CHAT_BASE_WIDTH, freeHeight / CHAT_BASE_HEIGHT)
    const candidates = [...document.querySelectorAll<HTMLElement>('[data-chat-keepclear]')].map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0)
    let best: { scale: number; left: number | null; right: number; bottom: number } | null = null
    for (let scale = Math.min(maxScale, CHAT_MAX_SCALE); scale >= CHAT_MIN_SCALE; scale -= 0.025) {
      const width = CHAT_BASE_WIDTH * scale
      const height = CHAT_BASE_HEIGHT * scale
      const y = actionRect.top - gap - height
      const xOptions = [window.innerWidth - gap - width, gap]
      for (const x of xOptions) {
        const overlaps = candidates.some((rect) => x < rect.right && x + width > rect.left && y < rect.bottom && y + height > rect.top)
        if (!overlaps) {
          best = { scale, left: x === gap ? x : null, right: x === gap ? 0 : gap, bottom: window.innerHeight - actionRect.top + gap }
          break
        }
      }
      if (best) break
    }
    const fits = Boolean(best)
    const scale = best?.scale ?? Math.min(CHAT_MAX_SCALE, Math.max(CHAT_MIN_SCALE, tableScale))
    const right = best?.right ?? gap
    const left = best?.left ?? null
    const bottom = best?.bottom ?? window.innerHeight - actionRect.top + gap
    const height = fits ? CHAT_BASE_HEIGHT * scale : Math.max(0, freeHeight)
    setLayout((previous) => {
      const next = { scale, left, right, bottom, height, fits, expandedScale, expandedHeight, expandedFits }
      return previous && Object.keys(next).every((key) => Math.abs((previous as any)[key] - (next as any)[key]) < 0.5) ? previous : next
    })
    if (debug) {
      setDebugRects([
        ...candidates.map((rect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, label: 'keep-clear' })),
        { left: window.innerWidth - gap - CHAT_EXPANDED_WIDTH * expandedScale, top: actionRect.top - gap - expandedHeight, width: CHAT_EXPANDED_WIDTH * expandedScale, height: expandedHeight, label: `chat ${expandedScale.toFixed(2)}x` },
      ])
    }
    if (!expandedFits && expandedRef.current && !fixture && !manualOpenRef.current) {
      setExpanded(false)
      sessionStorage.setItem(sessionKey(tableId), 'false')
    }
  }, [debug, fixture, tableId])

  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measureLayout)
    }
    const observer = new ResizeObserver(schedule)
    for (const selector of ['.table-area', '.poker-table', '.action-bar']) {
      const element = document.querySelector(selector)
      if (element) observer.observe(element)
    }
    document.querySelectorAll('[data-chat-keepclear]').forEach((element) => observer.observe(element))
    const table = document.querySelector('.poker-table')
    const mutations = new MutationObserver(schedule)
    if (table) mutations.observe(table, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [measureLayout])

  useEffect(() => {
    if (!socket || fixture) return
    const onHistory = (history: ChatMessage[], state?: { tableId: string; remainingMs: number; lockDurationMs: number }) => {
      setMessages(history)
      if (state?.tableId === tableId) {
        lockDurationRef.current = state.lockDurationMs
        applyLock(state.remainingMs)
      }
    }
    const onMessage = (message: ChatMessage) => {
      setMessages((items) => [...items, message].slice(-50))
      const own = message.senderId === myId
      if (own) pendingTextRef.current = ''
      setUnread((count) => nextUnreadCount(count, expandedRef.current, own))
      if (!own) {
        setTicker(message)
        window.clearTimeout(tickerTimer.current)
        tickerTimer.current = window.setTimeout(() => setTicker(null), 4000)
      }
    }
    const onRateLimited = ({ retryAfterMs, reason }: { retryAfterMs: number; reason?: string }) => {
      if (reason === 'table_lock') {
        if (!inputRef.current?.value) setText(pendingTextRef.current)
        pendingTextRef.current = ''
        applyLock(retryAfterMs)
      } else {
        pendingTextRef.current = ''
        applyLock(0)
        setCooldown(Math.max(1, Math.ceil(retryAfterMs / 1000)))
      }
    }
    const onLock = ({ tableId: lockedTableId, remainingMs }: { tableId: string; remainingMs: number }) => {
      if (lockedTableId === tableId) applyLock(remainingMs)
    }
    socket.emit('chat:join', { pin: tableId })
    socket.on('chat:history', onHistory)
    socket.on('chat:message', onMessage)
    socket.on('chat:rate_limited', onRateLimited)
    socket.on('chat:lock', onLock)
    return () => {
      window.clearTimeout(tickerTimer.current)
      socket.off('chat:history', onHistory)
      socket.off('chat:message', onMessage)
      socket.off('chat:rate_limited', onRateLimited)
      socket.off('chat:lock', onLock)
    }
  }, [socket, tableId, myId, fixture, applyLock])

  useEffect(() => {
    if (!expanded || !listRef.current || !stickToBottomRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, expanded, layout])

  useEffect(() => {
    if (!cooldown) return
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const open = () => { manualOpenRef.current = true; stickToBottomRef.current = true; setExpanded(true); setUnread(0); if (!fixture) sessionStorage.setItem(sessionKey(tableId), 'true') }
  const minimize = () => { manualOpenRef.current = false; setEmojiPickerOpen(false); setExpanded(false); if (!fixture) sessionStorage.setItem(sessionKey(tableId), 'false') }
  const insertEmoji = (emoji: string) => {
    const start = cursorPositionRef.current.start
    const end = cursorPositionRef.current.end
    const nextText = `${text.slice(0, start)}${emoji}${text.slice(end)}`
    if (countCodePoints(nextText) > CHAT_MAX_LENGTH) return
    setText(nextText)
    setEmojiPickerOpen(false)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      const cursor = start + emoji.length
      input.setSelectionRange(cursor, cursor)
      cursorPositionRef.current = { start: cursor, end: cursor }
    })
  }
  const send = (event: FormEvent) => {
    event.preventDefault()
    const clean = text.trim()
    if (!clean || countCodePoints(clean) > CHAT_MAX_LENGTH || cooldown || lockRemainingMs > 0 || spectator) return
    setEmojiPickerOpen(false)
    cursorPositionRef.current = { start: 0, end: 0 }
    if (fixture) { setText(''); return }
    applyLock(lockDurationRef.current)
    if (socket) {
      pendingTextRef.current = clean
      socket.emit('chat:send', { pin: tableId, text: clean })
    }
    else {
      const message: ChatMessage = { id: `${Date.now()}-me`, tableId, senderId: myId, senderName: people.get(myId)?.name ?? 'PLAYER', avatarId: myId, text: clean, ts: Date.now(), type: 'chat' }
      setMessages((items) => [...items, message].slice(-50))
    }
    setText('')
    inputRef.current?.focus()
  }
  const count = countCodePoints(text)
  const lockSeconds = Math.ceil(lockRemainingMs / 1000)
  const showLock = lockSeconds > cooldown
  const blocked = lockSeconds > 0 || cooldown > 0
  const chatStyle: CSSProperties = layout ? {
    '--chat-scale': layout.scale,
    '--chat-expanded-scale': layout.expandedScale,
    '--chat-left': expanded ? 'auto' : layout.left === null ? 'auto' : `${layout.left}px`,
    '--chat-right': `${expanded ? 12 : layout.right}px`,
    '--chat-bottom': `${expanded ? layout.bottom : layout.bottom}px`,
    '--chat-panel-height': `${layout.expandedHeight}px`,
  } as CSSProperties : {}
  return <>
  <aside className={`table-chat ${fixture ? 'is-fixture' : ''} ${expanded ? 'is-expanded' : 'is-collapsed'}`} style={{ ...chatStyle, ...(fixture ? { opacity: 1 } : {}) }} aria-label="Match chat">
    {expanded ? <section className="chat-panel">
      <header className="chat-header"><span className="chat-title"><span className="eight-ball">8</span>MATCH CHAT</span><button type="button" onClick={minimize} aria-label="Minimize chat">−</button></header>
      <div className="chat-list" ref={listRef} onScroll={(event) => { const list = event.currentTarget; stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 24 }}>
        {messages.map((message) => {
          const own = message.senderId === myId
          const person = people.get(message.senderId)
          return <article className={`chat-message ${own ? 'mine' : ''}`} key={message.id}>
            {!own && <img className="chat-avatar" style={{ borderColor: colorFor(message.senderId) }} src={person?.avatar} alt="" />}
            {own ? <div className="chat-copy mine-copy"><span className="chat-text">{message.text}</span><span className="chat-sender">: {message.senderName}</span></div> : <div className="chat-copy"><span className="chat-sender" style={{ color: '#ffc331' }}>{message.senderName}:</span><span className="chat-text"> {message.text}</span></div>}
            {own && <img className="chat-avatar" style={{ borderColor: '#22e6e6' }} src={person?.avatar} alt="" />}
          </article>
        })}
      </div>
      <form className="chat-compose" onSubmit={send}>
        <div className="chat-input-row">
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => {
              cursorPositionRef.current = { start: event.currentTarget.selectionStart ?? event.currentTarget.value.length, end: event.currentTarget.selectionEnd ?? event.currentTarget.value.length }
              if (countCodePoints(event.target.value) <= CHAT_MAX_LENGTH) setText(event.target.value)
            }}
            onSelect={(event) => { cursorPositionRef.current = { start: event.currentTarget.selectionStart ?? 0, end: event.currentTarget.selectionEnd ?? 0 } }}
            onBlur={(event) => { cursorPositionRef.current = { start: event.currentTarget.selectionStart ?? text.length, end: event.currentTarget.selectionEnd ?? text.length } }}
            onKeyDown={(event) => { if (event.key === 'Enter' && blocked) event.preventDefault(); if (event.key === 'Escape') event.currentTarget.blur() }}
            readOnly={lockSeconds > 0}
            disabled={spectator || Boolean(cooldown) && lockSeconds === 0}
            placeholder={spectator ? 'SPECTATORS CAN READ ONLY' : lockSeconds > 0 ? 'รอคิวพิมพ์...' : 'Type message to table...'}
            aria-label="Message to table"
          />
          <div className="chat-emoji-tools" ref={emojiPickerRef}>
            <button type="button" className="chat-emoji-toggle" aria-label="Choose emoji" aria-expanded={emojiPickerOpen} disabled={spectator || blocked} onPointerDown={() => {
              const input = inputRef.current
              if (input) cursorPositionRef.current = { start: input.selectionStart ?? text.length, end: input.selectionEnd ?? text.length }
            }} onClick={() => setEmojiPickerOpen((open) => !open)}>☺</button>
            {emojiPickerOpen && <div className="chat-emoji-picker" role="dialog" aria-label="Choose an emoji">
              {CHAT_EMOJIS.map((emoji) => <button key={emoji} type="button" className="chat-emoji-choice" aria-label={`Insert ${emoji}`} onPointerDown={(event) => event.preventDefault()} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}
            </div>}
          </div>
          <button type="submit" disabled={spectator || blocked}>SEND</button>
        </div>
        <small>{showLock ? <span className="chat-lock-hint">รอ <em>{lockSeconds}</em> วิ พิมพ์ต่อ</span> : cooldown ? `SLOW DOWN! ${cooldown}s` : 'PRESS ENTER ↵'}<b className={count > 110 ? 'warning' : ''}>{count}/{CHAT_MAX_LENGTH}</b></small>
      </form>
    </section> : <div className="chat-collapsed-row">
      {ticker && <button type="button" className="chat-ticker visible" onClick={open}><span><strong style={{ color: colorFor(ticker.senderId) }}>{ticker.senderName}:</strong> {ticker.text}</span><BubbleIcon /></button>}
      <button type="button" className="chat-toggle" onClick={open} aria-label="Open match chat"><BubbleIcon />{unread > 0 && <b className="chat-unread">{unread > 9 ? '9+' : unread}</b>}</button>
    </div>}
  </aside>
  {debug && <div className="chat-debug-overlay" aria-hidden="true">{debugRects.map((rect, index) => <i key={`${rect.label}-${index}`} className={rect.label.startsWith('chat') ? 'chat-debug-chat' : ''} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}<output>{layout ? `--u ${layout.expandedScale.toFixed(2)} · ${layout.expandedFits ? 'fits' : 'no fit'}` : 'measuring'}</output></div>}
  </>
}
