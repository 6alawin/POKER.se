import chatConfig from '../../shared/chat_config.json';

export const CHAT_MAX_LENGTH = 120;
// Shorter lock durations are reserved for test processes.
export const CHAT_TABLE_LOCK_MS = process.env.NODE_ENV === 'test' && Number(process.env.CHAT_TABLE_LOCK_MS) > 0
  ? Number(process.env.CHAT_TABLE_LOCK_MS) : chatConfig.CHAT_TABLE_LOCK_MS;
export const CHAT_BOTS_USE_TABLE_LOCK = chatConfig.CHAT_BOTS_USE_TABLE_LOCK;

export class ChatTableLock {
  private lockedUntil = 0;

  constructor(private readonly durationMs = CHAT_TABLE_LOCK_MS, private readonly now = () => performance.now(), private readonly botsUseLock = CHAT_BOTS_USE_TABLE_LOCK) {}

  remainingMs(): number {
    return Math.max(0, Math.ceil(this.lockedUntil - this.now()));
  }

  check(isBot: boolean): { ok: true } | { ok: false; retryAfterMs: number } {
    if (isBot && !this.botsUseLock) return { ok: true };
    const retryAfterMs = this.remainingMs();
    return retryAfterMs > 0 ? { ok: false, retryAfterMs } : { ok: true };
  }

  accept(isBot: boolean): number {
    if (isBot && !this.botsUseLock) return 0;
    this.lockedUntil = this.now() + this.durationMs;
    return this.remainingMs();
  }
}

export type ChatValidation = { ok: true; text: string } | { ok: false };

export function validateChatText(value: unknown): ChatValidation {
  if (typeof value !== 'string') return { ok: false };
  const text = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  if (!text || Array.from(text).length > CHAT_MAX_LENGTH) return { ok: false };
  return { ok: true, text };
}

export class ChatRateLimiter {
  private sentAt = new Map<string, number[]>();

  check(senderId: string, now = Date.now()): { ok: true } | { ok: false; retryAfterMs: number } {
    const recent = (this.sentAt.get(senderId) ?? []).filter((timestamp) => now - timestamp < 10_000);
    const oneSecondAgo = recent[recent.length - 1];
    const retry = oneSecondAgo !== undefined && now - oneSecondAgo < 1_000 ? 1_000 - (now - oneSecondAgo) : 0;
    const tenSecondRetry = recent.length >= 5 ? 10_000 - (now - recent[0]) : 0;
    const retryAfterMs = Math.max(retry, tenSecondRetry);
    if (retryAfterMs > 0) { this.sentAt.set(senderId, recent); return { ok: false, retryAfterMs }; }
    this.sentAt.set(senderId, [...recent, now]);
    return { ok: true };
  }
}

export function acceptChat(lock: ChatTableLock, limiter: ChatRateLimiter, senderId: string, isBot: boolean, now = Date.now()):
  | { ok: true; remainingMs: number }
  | { ok: false; reason: 'table_lock' | 'rate_limit'; retryAfterMs: number } {
  const table = lock.check(isBot);
  if (!table.ok) return { ok: false, reason: 'table_lock', retryAfterMs: table.retryAfterMs };
  const player = limiter.check(senderId, now);
  if (!player.ok) return { ok: false, reason: 'rate_limit', retryAfterMs: player.retryAfterMs };
  return { ok: true, remainingMs: lock.accept(isBot) };
}
