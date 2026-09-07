import React from 'react';
import PlayingCard from './PlayingCard';
import type { Card } from './PlayingCard';

interface Player {
  id: string;
  name: string;
  chips: number;
  avatar: string;
}

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isFolded: boolean;
  seatIndex: number;
  seatCount: number;
  currentBet: number;
  lastAction: string;
  isDealer: boolean;
  showCards?: boolean;
  holeCards?: Card[];
}

const getSeatPosition = (index: number, count: number) => {
  // Keep the local player's name and credits inside the table. The action bar
  // sits directly below this seat and would otherwise cover its lower half.
  if (index === 0) return { left: '50%', top: '89%' };
  const angle = Math.PI / 2 + (index * Math.PI * 2) / count
  return { left: `${50 - Math.cos(angle) * 44}%`, top: `${50 + Math.sin(angle) * 36}%` }
};

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isActive, isFolded, seatIndex, seatCount, currentBet, lastAction, isDealer, showCards, holeCards = [] }) => {
  const positionStyle = getSeatPosition(seatIndex, seatCount);
  
  return (
    <div 
      className={`player-seat ${seatIndex === 0 ? 'player-seat-self' : ''} ${isActive ? 'active' : ''} ${isFolded ? 'folded' : ''}`}
      style={positionStyle as React.CSSProperties}
    >
      <div className="seat-avatar">
        <img src={player.avatar} alt="" />
        {isDealer && <span className="dealer-chip">D</span>}
      </div>
      <div className="seat-info">
        <div className="seat-name">{player.name}</div>
        <div className="seat-chips">${player.chips.toLocaleString()}</div>
      </div>
      {(lastAction || currentBet > 0) && <div className="seat-action">{lastAction || `BET $${currentBet}`}</div>}
      {showCards && <div className="opponent-cards" aria-label={`${player.name}'s cards`}>
        {holeCards.map((card, index) => <PlayingCard key={`${card.suit}-${card.rank}-${index}`} card={card} />)}
      </div>}
    </div>
  );
};

export default PlayerSeat;
