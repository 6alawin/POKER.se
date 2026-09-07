import type { Card, Rank as RankValue, Suit } from './deck'
import { HandRank } from './hand'
import type { HandRank as HandRankValue } from './hand'

export function evaluateHand(cards: Card[]): { rank: HandRankValue; tiebreakers: number[] } {
  const rankCounts = countByRank(cards)
  const suitCounts = countBySuit(cards)

  const flushSuit = findFlushSuit(suitCounts)
  const straightHigh = findStraightHighCard(cards)

  if (flushSuit) {
    const flushCards = cards.filter((card) => card.suit === flushSuit)
    const sfHigh = findStraightHighCard(flushCards)
    if (sfHigh !== null) {
      return { rank: HandRank.StraightFlush, tiebreakers: [sfHigh] }
    }
  }

  const groups = groupByCount(rankCounts)
  const rankedValues = [...rankCounts.keys()].sort((a, b) => b - a)

  if (groups.fours.length > 0) {
    const quad = groups.fours[0]
    return { rank: HandRank.FourOfAKind, tiebreakers: [quad, ...rankedValues.filter((rank) => rank !== quad).slice(0, 1)] }
  }

  if (groups.threes.length > 0 && groups.threes.length + groups.pairs.length >= 2) {
    const trip = groups.threes[0]
    const pair = [...groups.threes.slice(1), ...groups.pairs].sort((a, b) => b - a)[0]
    return { rank: HandRank.FullHouse, tiebreakers: [trip, pair] }
  }

  if (flushSuit) {
    const topFive = getTopFiveOfSuit(cards, flushSuit)
    return { rank: HandRank.Flush, tiebreakers: topFive }
  }

  if (straightHigh) {
    return { rank: HandRank.Straight, tiebreakers: [straightHigh] }
  }

  if (groups.threes.length > 0) {
    const trip = groups.threes[0]
    return { rank: HandRank.ThreeOfAKind, tiebreakers: [trip, ...rankedValues.filter((rank) => rank !== trip).slice(0, 2)] }
  }

  if (groups.pairs.length >= 2) {
    const pairs = groups.pairs.slice(0, 2)
    return { rank: HandRank.TwoPair, tiebreakers: [...pairs, ...rankedValues.filter((rank) => !pairs.includes(rank)).slice(0, 1)] }
  }

  if (groups.pairs.length === 1) {
    const pair = groups.pairs[0]
    return { rank: HandRank.Pair, tiebreakers: [pair, ...rankedValues.filter((rank) => rank !== pair).slice(0, 3)] }
  }

  return { rank: HandRank.HighCard, tiebreakers: getTopFiveRanks(cards) }
}

function countByRank(cards: Card[]): Map<RankValue, number> {
  const counts = new Map<RankValue, number>()
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  }
  return counts
}

function countBySuit(cards: Card[]): Map<Suit, number> {
  const counts = new Map<Suit, number>()
  for (const card of cards) {
    counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1)
  }
  return counts
}

function findFlushSuit(suitCounts: Map<Suit, number>): Suit | null {
  for (const [suit, count] of suitCounts) {
    if (count >= 5) return suit
  }
  return null
}

function findStraightHighCard(cards: Card[]): RankValue | null {
  if (cards.length < 5) return null
  const distinctCards = [...new Set(cards.map((card) => card.rank))].sort((a, b) => a - b)
  let currentStreak = 1
  let highestStraight: RankValue | null = null

  for (let i = 1; i < distinctCards.length; i++) {
    if (distinctCards[i] - distinctCards[i - 1] === 1) {
      currentStreak += 1
    } else {
      currentStreak = 1
    }
    if (currentStreak >= 5) highestStraight = distinctCards[i]
  }

  if (([2, 3, 4, 5, 14] as RankValue[]).every((card) => distinctCards.includes(card))) {
    if (highestStraight === null || highestStraight < 5) highestStraight = 5 as RankValue
  }
  return highestStraight
}

type RankGroups = { fours: RankValue[]; threes: RankValue[]; pairs: RankValue[]; kickers: RankValue[] }

function groupByCount(rankCounts: Map<RankValue, number>): RankGroups {
  const groups: RankGroups = { fours: [], threes: [], pairs: [], kickers: [] }
  const entries = [...rankCounts.entries()].sort((a, b) => b[0] - a[0])
  for (const [rank, count] of entries) {
    if (count === 4) groups.fours.push(rank)
    if (count === 3) groups.threes.push(rank)
    if (count === 2) groups.pairs.push(rank)
    if (count === 1) groups.kickers.push(rank)
  }
  return groups
}

function getTopFiveOfSuit(cards: Card[], flushSuit: Suit): number[] {
  return cards.filter((card) => card.suit === flushSuit).map((card) => card.rank).sort((a, b) => b - a).slice(0, 5)
}

function getTopFiveRanks(cards: Card[]): number[] {
  return [...new Set(cards.map((card) => card.rank))].sort((a, b) => b - a).slice(0, 5)
}
