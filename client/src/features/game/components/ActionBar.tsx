import React, { useState } from 'react';
import PlayingCard from './PlayingCard';
import type { Card } from './PlayingCard';

interface ActionBarProps {
  holeCards: Card[];
  canCheck: boolean;
  minRaise: number;
  maxRaise: number;
  isMyTurn: boolean;
  callAmount: number;
  onFold: () => void;
  onCheck: () => void;
  onRaise: (amount: number) => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  holeCards,
  canCheck,
  minRaise,
  maxRaise,
  isMyTurn,
  callAmount,
  onFold,
  onCheck,
  onRaise
}) => {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const effectiveRaise = Math.min(Math.max(minRaise, raiseAmount), Math.max(minRaise, maxRaise));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaiseAmount(Number(e.target.value));
  };

  const handleRaiseClick = () => {
    onRaise(effectiveRaise);
  };

  return (
    <div className="action-bar">
      <div className="hole-cards">
        {holeCards.length === 2 ? (
          <>
            <PlayingCard card={holeCards[0]} className="large" />
            <PlayingCard card={holeCards[1]} className="large" />
          </>
        ) : (
          <>
            <PlayingCard hidden className="large" />
            <PlayingCard hidden className="large" />
          </>
        )}
      </div>

      <div className="action-buttons">
        <button className="action-btn btn-fold" onClick={onFold} disabled={!isMyTurn}>
          FOLD
        </button>
        <button className="action-btn btn-check" onClick={onCheck} disabled={!isMyTurn}>
          {canCheck ? 'CHECK' : `CALL $${callAmount}`}
        </button>
        <button className="action-btn btn-raise" onClick={handleRaiseClick} disabled={!isMyTurn || maxRaise < minRaise}>
          RAISE +${effectiveRaise}
        </button>
      </div>

      <div className="raise-slider-container">
        <input 
          type="range" 
          min={minRaise} 
          max={Math.max(minRaise, maxRaise)} 
          step={10}
          value={effectiveRaise} 
          onChange={handleSliderChange} 
          disabled={!isMyTurn}
        />
        <div className="raise-amount">+${effectiveRaise.toLocaleString()}</div>
      </div>
    </div>
  );
};

export default ActionBar;
