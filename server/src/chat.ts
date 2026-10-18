export const CHAT_MAX_LENGTH = 120;

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
