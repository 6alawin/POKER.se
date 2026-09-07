export type LobbyMember = { id: string; name: string; isHost: boolean }
export type LobbyRoom = { pin: string; maxPlayers: number; members: LobbyMember[] }

type WaitingRoomProps = {
  room: LobbyRoom
  currentSocketId?: string
  busy?: boolean
  error?: string
  onRefreshPin: () => void
  onStart: () => void
  onLeave: () => void
}

export default function WaitingRoom({ room, currentSocketId, busy, error, onRefreshPin, onStart, onLeave }: WaitingRoomProps) {
  const isHost = room.members.some((member) => member.id === currentSocketId && member.isHost)
  const canStart = room.members.length >= 2
  const copyPin = async () => navigator.clipboard?.writeText(room.pin).catch(() => undefined)

  return (
    <section className="waiting-room" aria-label="Game lobby">
      <p className="waiting-eyebrow">SHARE THIS PIN WITH FRIENDS</p>
      <div className="waiting-pin-row">
        <button className="waiting-pin" type="button" onClick={copyPin} title="Copy room PIN">{room.pin}</button>
        {isHost && <button className="refresh-pin" type="button" onClick={onRefreshPin} disabled={busy} aria-label="Generate a new room PIN">↻</button>}
      </div>
      <div className="waiting-rule" />
      <p className="waiting-status">WAITING FOR PLAYERS · {room.members.length}/{room.maxPlayers}</p>
      <div className="member-grid">
        {Array.from({ length: room.maxPlayers }, (_, index) => {
          const member = room.members[index]
          return member ? (
            <div className="member-slot filled" key={member.id}><span>{index + 1}.</span><b>{member.name}</b>{member.isHost && <em>HOST</em>}</div>
          ) : <div className="member-slot" key={`empty-${index}`}><span>{index + 1}.</span><b>OPEN SEAT</b></div>
        })}
      </div>
      <p className="host-hint">{isHost ? 'YOU ARE THE HOST. START WHEN EVERYONE IS READY.' : 'ONLY THE HOST CAN START THE GAME.'}</p>
      {error && <p className="room-error" role="alert">{error}</p>}
      <div className="waiting-actions">
        <button className="back-lobby-button" type="button" onClick={onLeave}>BACK TO LOBBY</button>
        {isHost && <button className="start-game-button" type="button" disabled={busy || !canStart} onClick={onStart}>START GAME</button>}
      </div>
    </section>
  )
}
