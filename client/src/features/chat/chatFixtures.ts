import cowboyAvatar from '../../assets/picture_profile/cowboy.png'
import pineAvatar from '../../assets/picture_profile/pine-tree.webp'
import cherryAvatar from '../../assets/picture_profile/cherry-tree.webp'
import plagueAvatar from '../../assets/picture_profile/plague-doctor.png'
import playerAvatar from '../../assets/picture_profile/ice-fishing.png'
import type { ChatMessage, ChatParticipant } from './TableChat'

export const chatFixtureParticipants: ChatParticipant[] = [
  { id: 'player1', name: 'JORCH', avatar: playerAvatar },
  { id: 'bot1', name: 'NeonJack', avatar: cowboyAvatar, isBot: true },
  { id: 'bot2', name: 'RetroMike', avatar: pineAvatar, isBot: true },
  { id: 'bot3', name: 'PixelQueen', avatar: cherryAvatar, isBot: true },
  { id: 'bot4', name: 'VaporJim', avatar: plagueAvatar, isBot: true },
]

export const chatFixtureMessages: ChatMessage[] = [
  { id: 'fixture-1', tableId: 'BOT', senderId: 'bot4', senderName: 'VaporJim', avatarId: 'bot4', text: 'Good luck everyone!', ts: 1, type: 'chat' },
  { id: 'fixture-2', tableId: 'BOT', senderId: 'bot3', senderName: 'PixelQueen', avatarId: 'bot3', text: 'May the best hand win ✨', ts: 2, type: 'chat' },
  { id: 'fixture-3', tableId: 'BOT', senderId: 'bot1', senderName: 'NeonJack', avatarId: 'bot1', text: 'ไม้เด็ดอยู่นี่นะ 😎', ts: 3, type: 'chat' },
  { id: 'fixture-4', tableId: 'BOT', senderId: 'player1', senderName: 'JORCH', avatarId: 'player1', text: 'ขอเบาๆ ได้มั้ยเนี่ย ♧', ts: 4, type: 'chat' },
]
