import type { Card } from './deck'

export interface PlayerHand {
  playerId: string
  holeCards: Card[]
}

export const HandRank = { HighCard: 0, Pair: 1, TwoPair: 2, ThreeOfAKind: 3, Straight: 4, Flush: 5, FullHouse: 6, FourOfAKind: 7, StraightFlush: 8 } as const
export type HandRank = typeof HandRank[keyof typeof HandRank]

export interface HandEvaluation {
  playerId: string
  rank: HandRank
  bestFive: Card[]
  tiebreakers: number[]
}
