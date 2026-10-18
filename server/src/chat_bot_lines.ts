export const BOT_CHAT_LINES = {
  gameStart: ['Good luck everyone!', 'May the best hand win ✨', 'ไม้เด็ดอยู่นี่นะ 😎'],
  potWin: ['Nice pot!', 'That hand was wild!', 'เก็บพอตแล้วนะ!'],
  foldToRaise: ['That raise means business.', 'I will wait for a better spot.', 'หมอบก่อนดีกว่า!'],
  allIn: ['All in? I like your style.', 'เดิมพันนี้มีลุ้น!', 'Big stack, big move.'],
} as const;

export type BotChatTrigger = keyof typeof BOT_CHAT_LINES;
