import { useEffect, useRef, useState } from 'react'

export type RoomTab = 'join' | 'create'

type RoomFormProps = {
  initialTab?: RoomTab
  busy?: boolean
  error?: string
  onClose: () => void
  onCreate: (maxPlayers: number) => void
  onJoin: (pin: string) => void
}

export default function RoomForm({ initialTab = 'join', busy = false, error, onClose, onCreate, onJoin }: RoomFormProps) {
  const [tab, setTab] = useState<RoomTab>(initialTab)
  const [pin, setPin] = useState<string[]>([])
  const [players, setPlayers] = useState(2)
  const modalRef = useRef<HTMLElement>(null)

  useEffect(() => {
    modalRef.current?.focus()
  }, [])

  const appendPin = (digit: string) => setPin((value) => value.length < 4 ? [...value, digit] : value)
  const erasePin = () => setPin((value) => value.slice(0, -1))

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (tab !== 'join') return
    if (/^\d$/.test(event.key)) appendPin(event.key)
    if (event.key === 'Backspace') erasePin()
    if (event.key === 'Enter' && pin.length === 4 && !busy) onJoin(pin.join(''))
    if (event.key === 'Escape') onClose()
  }

  const changeTab = (nextTab: RoomTab) => {
    setTab(nextTab)
    setPin([])
  }

  return (
    <section ref={modalRef} className="room-modal" aria-label="Play with friends" tabIndex={-1} onKeyDown={handleKeyDown}>
      <button className="room-close" type="button" onClick={onClose} aria-label="Close room dialog">×</button>
      <div className="room-tabs" role="tablist" aria-label="Room action">
        <button role="tab" aria-selected={tab === 'join'} className={tab === 'join' ? 'selected' : ''} onClick={() => changeTab('join')}>JOIN ROOM</button>
        <button role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'selected' : ''} onClick={() => changeTab('create')}>CREATE ROOM</button>
      </div>

      {tab === 'join' ? (
        <div className="join-room-content">
          <h2>ENTER 4-DIGIT ROOM PIN</h2>
          <div className="pin-entry" aria-label={`${pin.length} of 4 digits entered`}>
            {Array.from({ length: 4 }, (_, index) => <span key={index}>{pin[index] ?? ''}</span>)}
          </div>
          <div className="join-controls">
            <div className="keypad" aria-label="Number pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                <button type="button" key={number} onClick={() => appendPin(String(number))}>{number}</button>
              ))}
              <button className="key-delete" type="button" onClick={erasePin} aria-label="Delete last digit">⌫</button>
              <button type="button" onClick={() => appendPin('0')}>0</button>
            </div>
            <button className="join-room-button" type="button" disabled={pin.length !== 4 || busy} onClick={() => onJoin(pin.join(''))}>
              {busy ? 'WAIT...' : 'JOIN'}
            </button>
          </div>
        </div>
      ) : (
        <div className="create-room-content">
          <p>CHOOSE YOUR TABLE SIZE</p>
          <div className="max-player-options" role="radiogroup" aria-label="Maximum players">
            {[2, 6, 9].map((value) => (
              <button type="button" role="radio" aria-checked={players === value} className={players === value ? 'selected' : ''} key={value} onClick={() => setPlayers(value)}>
                <span aria-hidden="true" /> {value}
              </button>
            ))}
          </div>
          <small>MAX PLAYERS</small>
          <button className="create-room-button" type="button" disabled={busy} onClick={() => onCreate(players)}>
            {busy ? 'CREATING...' : 'CREATE'}
          </button>
        </div>
      )}

      {error && <p className="room-error" role="alert">{error}</p>}
    </section>
  )
}
