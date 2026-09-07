import React from 'react';
import { useNavigate } from 'react-router-dom';

type QuickMatchModalProps = {
  onClose: () => void;
};

export default function QuickMatchModal({ onClose }: QuickMatchModalProps) {
  const navigate = useNavigate();
  const [selectedStake, setSelectedStake] = React.useState('mid');

  return (
    <div className="overlay" onClick={onClose}>
      <section className="quick-match-modal" onClick={(e) => e.stopPropagation()}>
        <button className="quick-close" onClick={onClose} aria-label="Close quick match">✕</button>
        
        <h2 className="quick-title">
          CASUAL TABLE<br />MATCHMAKING
        </h2>

        <div className="stakes-list">
          <button 
            className={`stake-option ${selectedStake === 'micro' ? 'selected' : ''}`}
            onClick={() => setSelectedStake('micro')}
          >
            <span aria-hidden="true">♠</span>
            MICRO STAKES (10/20)
            <span aria-hidden="true">♦</span>
          </button>
          
          <button 
            className={`stake-option ${selectedStake === 'mid' ? 'selected' : ''}`}
            onClick={() => setSelectedStake('mid')}
          >
            <span aria-hidden="true">♠</span>
            MID STAKES (25/50)
            <span aria-hidden="true">♦</span>
          </button>
          
          <button 
            className={`stake-option ${selectedStake === 'high' ? 'selected' : ''}`}
            onClick={() => setSelectedStake('high')}
          >
            <span aria-hidden="true">♠</span>
            HIGH ROLLERS (50/100)
            <span aria-hidden="true">♦</span>
          </button>
        </div>

        <div className="quick-join-wrap">
          <button 
            className="quick-join"
            onClick={() => navigate('/play', { state: { mode: 'bots', botCount: 5, stake: selectedStake } })}
          >
            QUICK JOIN
          </button>
        </div>
      </section>
    </div>
  );
}
