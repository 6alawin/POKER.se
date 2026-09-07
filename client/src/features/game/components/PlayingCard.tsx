import React from 'react';

export interface Card {
  rank: number;
  suit: string;
}

interface PlayingCardProps {
  card?: Card;
  hidden?: boolean;
  className?: string;
}

const getRankSymbol = (rank: number) => {
  switch (rank) {
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    case 14: return 'A';
    default: return rank.toString();
  }
};

const getSuitSymbol = (suit: string) => {
  switch (suit.toLowerCase()) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'spades': return '♠';
    case 'clubs': return '♣';
    default: return suit;
  }
};

const isRed = (suit: string) => suit.toLowerCase() === 'hearts' || suit.toLowerCase() === 'diamonds';

const PlayingCard: React.FC<PlayingCardProps> = ({ card, hidden = false, className = '' }) => {
  if (hidden || !card) {
    return <div className={`playing-card card-back ${className}`}></div>;
  }

  const rankSymbol = getRankSymbol(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);
  const colorClass = isRed(card.suit) ? 'card-red' : 'card-black';

  return (
    <div className={`playing-card ${colorClass} ${className}`}>
      <div className="card-rank">{rankSymbol}</div>
      <div className="card-suit">{suitSymbol}</div>
    </div>
  );
};

export default PlayingCard;
