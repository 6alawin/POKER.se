import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
  const [unread, setUnread] = useState(demo === 'collapsed' ? 3 : 0)
  const [cooldown, setCooldown] = useState(0)
  const [lockRemainingMs, setLockRemainingMs] = useState(0)
  const lockDeadlineRef = useRef(0)
  const lockDurationRef = useRef(chatConfig.CHAT_TABLE_LOCK_MS)
  const pendingTextRef = useRef('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tickerTimer = useRef<number | undefined>(undefined)
  const expandedRef = useRef(expanded)
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
    const timer = window.setInterval(() => setLockRemainingMs(Math.max(0, lockDeadlineRef.current - performance.now())), 200)
    return () => window.clearInterval(timer)
  }, [lockRemainingMs > 0]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!expanded || !listRef.current) return
    const list = listRef.current
    if (list.scrollHeight - list.scrollTop - list.clientHeight < 24) list.scrollTop = list.scrollHeight
  }, [messages, expanded])

  useEffect(() => {
    if (!cooldown) return
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const open = () => { setExpanded(true); setUnread(0); if (!fixture) sessionStorage.setItem(sessionKey(tableId), 'true') }
  const minimize = () => { setExpanded(false); if (!fixture) sessionStorage.setItem(sessionKey(tableId), 'false') }
  const send = (event: FormEvent) => {
    event.preventDefault()
    const clean = text.trim()
    if (!clean || countCodePoints(clean) > CHAT_MAX_LENGTH || cooldown || lockRemainingMs > 0 || spectator) return
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
  return <aside className={`table-chat ${fixture ? 'is-fixture' : ''} ${expanded ? 'is-expanded' : 'is-collapsed'}`} style={fixture ? { opacity: 1 } : undefined} aria-label="Match chat">
    {expanded ? <section className="chat-panel">
      <header className="chat-header"><span className="chat-title"><span className="eight-ball">8</span>MATCH CHAT</span><button type="button" onClick={minimize} aria-label="Minimize chat">−</button></header>
      <div className="chat-list" ref={listRef}>
        {messages.map((message) => {
          const own = message.senderId === myId
          const person = people.get(message.senderId)
          return <article className={`chat-message ${own ? 'mine' : ''}`} key={message.id}>
            {!own && <img className="chat-avatar" style={{ borderColor: colorFor(message.senderId) }} src={person?.avatar} alt="" />}
            <div className="chat-copy"><span className="chat-sender" style={{ color: own ? '#22e6e6' : colorFor(message.senderId) }}>{message.senderName}{own ? ' (YOU)' : ''}:</span><span className="chat-text"> {message.text}</span></div>
            {own && <img className="chat-avatar" style={{ borderColor: '#22e6e6' }} src={person?.avatar} alt="" />}
          </article>
        })}
      </div>
      <form className="chat-compose" onSubmit={send}>
        <div className="chat-input-row"><input ref={inputRef} value={text} onChange={(event) => { if (countCodePoints(event.target.value) <= CHAT_MAX_LENGTH) setText(event.target.value) }} onKeyDown={(event) => { if (event.key === 'Enter' && blocked) event.preventDefault(); if (event.key === 'Escape') event.currentTarget.blur() }} readOnly={lockSeconds > 0} disabled={spectator || Boolean(cooldown) && lockSeconds === 0} placeholder={spectator ? 'SPECTATORS CAN READ ONLY' : lockSeconds > 0 ? 'รอคิวพิมพ์...' : 'Type message to table...'} aria-label="Message to table" /><button type="submit" disabled={spectator || blocked || !text.trim()}>SEND</button></div>
        <small>{showLock ? <span className="chat-lock-hint">รอ <em>{lockSeconds}</em> วิ พิมพ์ต่อ</span> : cooldown ? `SLOW DOWN! ${cooldown}s` : 'PRESS ENTER ↵'}<b className={count > 110 ? 'warning' : ''}>{count}/{CHAT_MAX_LENGTH}</b></small>
      </form>
    </section> : <div className="chat-collapsed-row">
      {ticker && <button type="button" className="chat-ticker visible" onClick={open}><span><strong style={{ color: colorFor(ticker.senderId) }}>{ticker.senderName}:</strong> {ticker.text}</span><BubbleIcon /></button>}
      <button type="button" className="chat-toggle" onClick={open} aria-label="Open match chat"><BubbleIcon />{unread > 0 && <b className="chat-unread">{unread > 9 ? '9+' : unread}</b>}</button>
    </div>}
  </aside>
}
