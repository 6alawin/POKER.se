export const CHAT_MAX_LENGTH = 120

export function countCodePoints(value: string): number {
  return Array.from(value).length
}

export function nextUnreadCount(current: number, isExpanded: boolean, isOwnMessage: boolean): number {
  return !isExpanded && !isOwnMessage ? current + 1 : current
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as { tagName?: unknown; isContentEditable?: unknown } | null
  if (!element) return false
  const tag = typeof element.tagName === 'string' ? element.tagName.toLowerCase() : ''
  return tag === 'input' || tag === 'textarea' || element.isContentEditable === true
}

export function shouldIgnoreGameHotkey(event: KeyboardEvent): boolean {
  return isTypingTarget(event.target)
}
