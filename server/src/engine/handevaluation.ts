import { Card, Rank, Suit } from "./deck";
import { HandRank } from "./hand";

export function evaluateHand(cards: Card[]): {
  rank: HandRank;
  tiebreakers: number[];
} {
  const rankCounts = countByRank(cards); // { 14: 2, 5: 3, 9: 1, ... }
  const suitCounts = countBySuit(cards); // { spades: 5, hearts: 2, ... }

  const flushSuit = findFlushSuit(suitCounts); // suit ไหนมีครบ 5+ ใบ ไหมม
  const straightHigh = findStraightHighCard(cards); // rank สูงสุดของ straight ถ้ามี

  // เช็คจากสูงสุดไปต่ำสุด หยุดทันทีที่เจอ
  if (flushSuit) {
    const flushCards = cards.filter((card) => card.suit === flushSuit);
    const sfHigh = findStraightHighCard(flushCards);

    if (sfHigh !== null) {
      return {
        rank: HandRank.StraightFlush,
        tiebreakers: [sfHigh],
      };
    }
  }

  const groups = groupByCount(rankCounts); // แยกว่า rank ไหนมีกี่ใบ เรียงจากมากไปน้อย

  if (groups.fours.length > 0) {
    return {
      rank: HandRank.FourOfAKind,
      tiebreakers: [...groups.fours, ...groups.kickers].slice(0, 2),
    };
  }

  if (groups.threes.length > 0 && groups.pairs.length > 0) {
    return {
      rank: HandRank.FullHouse,
      tiebreakers: [...groups.threes, ...groups.pairs],
    };
  }

  if (flushSuit) {
    const topFive = getTopFiveOfSuit(cards, flushSuit);
    return { rank: HandRank.Flush, tiebreakers: topFive };
  }

  if (straightHigh) {
    return { rank: HandRank.Straight, tiebreakers: [straightHigh] };
  }

  if (groups.threes.length > 0) {
    return {
      rank: HandRank.ThreeOfAKind,
      tiebreakers: [...groups.threes, ...groups.kickers].slice(0, 3),
    };
  }

  if (groups.pairs.length >= 2) {
    return {
      rank: HandRank.TwoPair,
      tiebreakers: [...groups.pairs, ...groups.kickers].slice(0, 3),
    };
  }

  if (groups.pairs.length === 1) {
    return {
      rank: HandRank.Pair,
      tiebreakers: [...groups.pairs, ...groups.kickers].slice(0, 4),
    };
  }

  return { rank: HandRank.HighCard, tiebreakers: getTopFiveRanks(cards) };
}

function countByRank(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();

  for (const card of cards) {
    const current = counts.get(card.rank) ?? 0;
    counts.set(card.rank, current + 1);
  }

  return counts;
}

function countBySuit(cards: Card[]): Map<Suit, number> {
  const counts = new Map<Suit, number>();

  for (const card of cards) {
    const current = counts.get(card.suit) ?? 0;
    counts.set(card.suit, current + 1);
  }

  return counts;
}

function findFlushSuit(suitCounts: Map<Suit, number>): Suit | null {
  for (const [suit, count] of suitCounts) {
    if (count >= 5) {
      return suit;
    }
  }
  return null;
}

function findStraightHighCard(cards: Card[]): Rank | null {
  if (cards.length < 5) {
    return null;
  }

  const distinctCards = [...new Set(cards.map((card) => card.rank))].sort(
    (a, b) => a - b,
  );

  let currentStreak: number = 1;
  let highestStraight: Rank | null = null;

  for (let i = 1; i < distinctCards.length; i++) {
    if (distinctCards[i] - distinctCards[i - 1] === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    if (currentStreak >= 5) {
      highestStraight = distinctCards[i];
    }
  }
  if ([2, 3, 4, 5, 14].every((card) => distinctCards.includes(card))) {
    if (highestStraight === null || highestStraight < 5) {
      highestStraight = 5;
    }
  }

  return highestStraight;
}

type RankGroups = {
  fours: Rank[];
  threes: Rank[];
  pairs: Rank[];
  kickers: Rank[];
};

function groupByCount(rankCounts: Map<Rank, number>): RankGroups {
  const groups: RankGroups = {
    fours: [],
    threes: [],
    pairs: [],
    kickers: [],
  };

  const entries = [...rankCounts.entries()].sort((a, b) => b[0] - a[0]);

  for (const [rank, count] of entries) {
    if (count === 4) {
      groups.fours.push(rank);
    }
    if (count === 3) {
      groups.threes.push(rank);
    }
    if (count === 2) {
      groups.pairs.push(rank);
    }
    if (count === 1) {
      groups.kickers.push(rank);
    }
  }

  return groups;
}

function getTopFiveOfSuit(cards: Card[], flushSuit: Suit): number[] {
  return cards
    .filter((card) => card.suit === flushSuit)
    .map((card) => card.rank)
    .sort((a, b) => b - a)
    .slice(0, 5);
}

function getTopFiveRanks(cards: Card[]): number[] {
  return cards
    .map((card) => card.rank)
    .sort((a, b) => b - a)
    .slice(0, 5);
}
