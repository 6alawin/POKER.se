import { Card } from "./deck";

export interface PlayerHand { 
    playerId: string;
    holeCards: Card[]; //ไพ้่ 2 ใบบนมือ
}

export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export interface HandEvaluation {
  playerId: string;
  rank: HandRank;
  bestFive: Card[];        // 5 ใบที่ดีที่สุดจากไพ่ 7 ใบ (hole + community)
  tiebreakers: number[];   // ไล่เทียบตอนแต้มเท่ากัน เรียงจากสำคัญสุดไปหาน้อยสุด
}