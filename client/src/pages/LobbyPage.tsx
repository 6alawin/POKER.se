import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import TrophyIcon from '../components/ui/TrophyIcon'
import RoomForm from '../features/rooms/components/RoomForm'
import type { RoomTab } from '../features/rooms/components/RoomForm'
import WaitingRoom from '../features/rooms/components/WaitingRoom'
import type { LobbyRoom } from '../features/rooms/components/WaitingRoom'
import QuickMatchModal from '../features/game/components/QuickMatchModal'
import { useSocket } from '../hooks/useSocket'

type RoomReply = { ok: boolean; room?: LobbyRoom; error?: string }

export default function LobbyPage() {
  const navigate = useNavigate()
  const socket = useSocket()
  const [roomTab, setRoomTab] = useState<RoomTab | null>(null)
  const [showQuick, setShowQuick] = useState(false)
  const [room, setRoom] = useState<LobbyRoom | null>(null)
  const [busy, setBusy] = useState(false)
  const [roomError, setRoomError] = useState('')
  const username = localStorage.getItem('poker-username') || 'Player'

  useEffect(() => {
    const updateRoom = (nextRoom: LobbyRoom) => setRoom(nextRoom)
    const gameStarted = (startedRoom: LobbyRoom) => navigate('/play', { state: { mode: 'friends', room: startedRoom, playerId: socket.id } })
    const closed = () => {
      setRoom(null)
      setRoomError('THE HOST CLOSED THIS ROOM.')
    }
    socket.on('room:updated', updateRoom)
    socket.on('room:started', gameStarted)
    socket.on('room:closed', closed)
    return () => {
      socket.off('room:updated', updateRoom)
      socket.off('room:started', gameStarted)
      socket.off('room:closed', closed)
    }
  }, [navigate, socket])

  const createRoom = (maxPlayers: number) => {
    setBusy(true); setRoomError('')
    socket.timeout(4000).emit('room:create', { name: username, maxPlayers }, (timeoutError: Error | null, reply?: RoomReply) => {
      setBusy(false)
      if (timeoutError || !reply?.ok || !reply.room) return setRoomError(reply?.error || 'ROOM SERVER IS OFFLINE. PLEASE TRY AGAIN.')
      setRoom(reply.room); setRoomTab(null)
    })
  }

  const joinRoom = (pin: string) => {
    setBusy(true); setRoomError('')
    socket.timeout(4000).emit('room:join', { name: username, pin }, (timeoutError: Error | null, reply?: RoomReply) => {
      setBusy(false)
      if (timeoutError || !reply?.ok || !reply.room) return setRoomError(reply?.error || 'ROOM NOT FOUND OR SERVER IS OFFLINE.')
      setRoom(reply.room); setRoomTab(null)
    })
  }

  const refreshPin = () => {
    if (!room) return
    setBusy(true)
    socket.emit('room:repin', { pin: room.pin }, (reply: RoomReply) => {
      setBusy(false)
      if (reply.ok && reply.room) setRoom(reply.room)
      else setRoomError(reply.error || 'COULD NOT CHANGE THE PIN.')
    })
  }

  const startGame = () => {
    if (!room) return
    setBusy(true)
    socket.emit('room:start', { pin: room.pin }, (reply: RoomReply) => {
      setBusy(false)
      if (!reply.ok) setRoomError(reply.error || 'COULD NOT START THE GAME.')
    })
  }

  const leaveRoom = () => {
    if (room) socket.emit('room:leave', { pin: room.pin })
    setRoom(null); setRoomError('')
  }

  return (
    <main className="lobby-page">
      <PageHeader />
      <section className="lobby-content">
        <p className="lobby-kicker">CHOOSE YOUR TABLE</p>
        <h1>SELECT MODE</h1>
        <div className="modes">
          <button className="mode friend" onClick={() => { setRoomTab('join'); setRoomError('') }}>
            <span className="mode-icon"><img src="/images/player_icon.png" alt="" /></span>
            <b>PLAY WITH FRIENDS</b><small>CREATE OR JOIN WITH A PIN</small>
          </button>
          <button className="mode bot" onClick={() => setShowQuick(true)}>
            <span className="mode-icon"><img src="/images/bot_icon.png" alt="" /></span>
            <b>PLAY WITH BOTS</b><small>PRACTICE TEXAS HOLD'EM</small>
          </button>
        </div>
      </section>
      <footer><button onClick={() => alert('Leaderboard is coming soon.')}><TrophyIcon /><span>LEADERBOARD</span></button></footer>

      {roomTab && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRoomTab(null) }}>
        <RoomForm initialTab={roomTab} busy={busy} error={roomError} onClose={() => setRoomTab(null)} onCreate={createRoom} onJoin={joinRoom} />
      </div>}
      {room && <div className="room-lobby-overlay"><WaitingRoom room={room} currentSocketId={socket.id} busy={busy} error={roomError} onRefreshPin={refreshPin} onStart={startGame} onLeave={leaveRoom} /></div>}
      {showQuick && <QuickMatchModal onClose={() => setShowQuick(false)} />}
    </main>
  )
}
