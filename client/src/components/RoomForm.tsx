import { useState } from 'react'

type RoomTab = 'join' | 'create'

export default function RoomForm({ onComplete }: { onComplete?: () => void }) {
  const [tab, setTab] = useState<RoomTab>('join')
  const [pin, setPin] = useState(['', '', '', ''])
  const [players, setPlayers] = useState(2)
  const [privateRoom, setPrivateRoom] = useState(true)
  const [blinds, setBlinds] = useState('10 / 20')
  const appendPin = (digit: string) => setPin(value => { const copy = [...value]; const next = copy.findIndex(item => !item); if (next !== -1) copy[next] = digit; return copy })
  const resetPin = () => setPin(['', '', '', ''])

  return <section className="room-modal" aria-label="Room settings"><div className="tabs"><button className={tab === 'join' ? 'selected' : ''} onClick={() => setTab('join')}>JOIN ROOM</button><button className={tab === 'create' ? 'selected' : ''} onClick={() => setTab('create')}>CREATE ROOM</button></div><div className={`room-content ${tab}`}><div className="pin-panel"><h2>{tab === 'join' ? 'Enter 4-Digit Room PIN' : ''}</h2><div className="pin-boxes">{pin.map((digit, index) => <span key={index}>{digit}</span>)}</div>{tab === 'create' && <><div className="generated-pin">1234 <button onClick={resetPin} aria-label="Generate new code">↻</button></div><u>Room PIN</u></>}{tab === 'join' && <div className="keypad">{[1,2,3,4,5,6,7,8,9,0].map(n => <button key={n} onClick={() => appendPin(String(n))}>{n}</button>)}</div>}</div><div className="settings-panel"><h2>{tab === 'join' ? 'Room Settings' : 'Blinds:'}</h2><label className="select-row">{tab === 'join' && 'Blinds:'}<select value={blinds} onChange={e => setBlinds(e.target.value)}><option>10 / 20</option><option>25 / 50</option><option>50 / 100</option></select></label>{tab === 'create' && <label className="buy-in">Buy-in:<input inputMode="numeric" /></label>}<div className="players"><strong>Max Players:</strong><div>{[2, 6, 9].map(value => <label key={value}><input type="radio" checked={players === value} onChange={() => setPlayers(value)} /> {value}</label>)}</div></div>{tab === 'create' && <label className="private"><input type="checkbox" checked={privateRoom} onChange={() => setPrivateRoom(!privateRoom)} /> Private Room</label>}</div>{tab === 'join' && <button className="join-button" disabled={pin.some(value => !value)} onClick={onComplete}>JOIN</button>}</div><button className="create-button" onClick={onComplete}>CREATE</button></section>
}
