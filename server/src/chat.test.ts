import { describe, expect, it } from 'vitest';
import { ChatRateLimiter, CHAT_MAX_LENGTH, validateChatText } from './chat';
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
