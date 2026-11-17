import { describe, expect, it } from 'vitest';
import { ChatRateLimiter, ChatTableLock, CHAT_MAX_LENGTH, acceptChat, validateChatText } from './chat';
import { nextUnreadCount, shouldIgnoreGameHotkey } from '../../client/src/features/chat/chatState';

describe('chat validation', () => {
  it('counts Unicode code points, trims whitespace, and removes controls', () => {
    expect(validateChatText('  hello\nworld  ')).toEqual({ ok: true, text: 'helloworld' });
    expect(validateChatText('   ')).toEqual({ ok: false });
    expect(validateChatText('😀'.repeat(CHAT_MAX_LENGTH))).toEqual({ ok: true, text: '😀'.repeat(CHAT_MAX_LENGTH) });
    expect(validateChatText('😀'.repeat(CHAT_MAX_LENGTH + 1))).toEqual({ ok: false });
  });
});

describe('chat rate limiter', () => {
  it('permits one message per second and at most five per ten seconds', () => {
    const limiter = new ChatRateLimiter();
    expect(limiter.check('a', 0)).toEqual({ ok: true });
    expect(limiter.check('a', 500)).toEqual({ ok: false, retryAfterMs: 500 });
    for (const timestamp of [1_000, 2_000, 3_000, 4_000]) expect(limiter.check('a', timestamp)).toEqual({ ok: true });
    expect(limiter.check('a', 5_000)).toEqual({ ok: false, retryAfterMs: 5_000 });
  });
});

describe('client chat state helpers', () => {
  it('only increments unread messages while collapsed and for another player', () => {
    expect(nextUnreadCount(2, false, false)).toBe(3);
    expect(nextUnreadCount(2, true, false)).toBe(2);
    expect(nextUnreadCount(2, false, true)).toBe(2);
  });

  it('ignores global game hotkeys while a chat field owns the event', () => {
    expect(shouldIgnoreGameHotkey({ target: { tagName: 'INPUT' } } as unknown as KeyboardEvent)).toBe(true);
    expect(shouldIgnoreGameHotkey({ target: { tagName: 'DIV' } } as unknown as KeyboardEvent)).toBe(false);
  });
});

function table(botsUseLock = false) {
  let now = 0;
  const lock = new ChatTableLock(10_000, () => now, botsUseLock);
  const limiter = new ChatRateLimiter();
  return {
    lock,
    send: (sender: string, isBot = false) => acceptChat(lock, limiter, sender, isBot, now),
    advance: (ms: number) => { now += ms; },
  };
}

describe('table chat lock', () => {
  it('accepts one send, rejects all humans until the original deadline, then unlocks', () => {
    const room = table();
    expect(room.send('a')).toEqual({ ok: true, remainingMs: 10_000 });
    room.advance(1_000);
    expect(room.send('a')).toEqual({ ok: false, reason: 'table_lock', retryAfterMs: 9_000 });
    expect(room.send('b')).toEqual({ ok: false, reason: 'table_lock', retryAfterMs: 9_000 });
    room.advance(1_000);
    expect(room.send('b')).toEqual({ ok: false, reason: 'table_lock', retryAfterMs: 8_000 });
    room.advance(7_000);
    expect(room.send('b')).toEqual({ ok: false, reason: 'table_lock', retryAfterMs: 1_000 });
    expect(room.lock.remainingMs()).toBe(1_000);
    room.advance(1_000);
    expect(room.send('b')).toEqual({ ok: true, remainingMs: 10_000 });
  });

  it('isolates tables and atomically accepts only the first same-tick send', () => {
    const a = table();
    const b = table();
    expect(a.send('one').ok).toBe(true);
    expect(a.send('two')).toMatchObject({ ok: false, reason: 'table_lock' });
    expect(b.send('two').ok).toBe(true);
  });

  it('exempts bots by default and makes them follow the lock when enabled', () => {
    const room = table();
    room.send('human');
    expect(room.send('bot', true)).toEqual({ ok: true, remainingMs: 0 });
    expect(room.lock.remainingMs()).toBe(10_000);
    const botsLocked = table(true);
    expect(botsLocked.send('bot', true)).toEqual({ ok: true, remainingMs: 10_000 });
    expect(botsLocked.send('human')).toMatchObject({ ok: false, reason: 'table_lock' });
  });

  it('does not charge lock rejections to the personal limiter', () => {
    const room = table();
    room.send('a');
    room.advance(1_000);
    for (let i = 0; i < 10; i += 1) expect(room.send('b')).toMatchObject({ ok: false, reason: 'table_lock' });
    room.advance(9_000);
    expect(room.send('b').ok).toBe(true);
  });

  it('reports remaining milliseconds for a late joiner without changing the deadline', () => {
    const room = table();
    room.send('a');
    room.advance(3_250);
    expect(room.lock.remainingMs()).toBe(6_750);
    room.advance(6_750);
    expect(room.lock.remainingMs()).toBe(0);
  });
});
