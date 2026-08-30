import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import RoomForm from '../features/rooms/components/RoomForm'
import { getRoom, startRoom, type RoomDetails } from '../features/rooms/api'
import { useSocket } from '../hooks/useSocket'
import { getAuthToken } from '../lib/auth-token'
import { verifyUser } from '../features/auth/api/auth'
import PlayroomPage from './PlayroomPage'

function WaitingRoom({ tableId }: { tableId: string }) {
  const navigate = useNavigate()
  const socket = useSocket()
  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [loadError, setLoadError] = useState('')
  const [startError, setStartError] = useState('')
  const [currentUid, setCurrentUid] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const loadRoom = useCallback(async () => {
    try { setRoom(await getRoom(tableId)); setLoadError('') }
    catch (cause) { setLoadError(axios.isAxiosError(cause) ? cause.response?.data?.message || 'Unable to load room.' : 'Unable to load room.') }
  }, [tableId])
  useEffect(() => {
    const request = window.setTimeout(() => void loadRoom(), 0)
    return () => window.clearTimeout(request)
  }, [loadRoom])
  useEffect(() => {
    const subscribe = () => socket.emit('room:subscribe', tableId)
    socket.on('connect', subscribe); socket.on('room:updated', loadRoom)
    if (socket.connected) subscribe()
    return () => { socket.off('connect', subscribe); socket.off('room:updated', loadRoom) }
  }, [socket, tableId, loadRoom])
  useEffect(() => {
    const request = window.setTimeout(() => {
      const token = getAuthToken()
      if (token) void verifyUser(token).then(result => setCurrentUid(result.uid || null)).catch(() => setCurrentUid(null))
    }, 0)
    return () => window.clearTimeout(request)
  }, [])
  async function startGame() {
    if (!currentUid) return
    setStartError('')
    setIsStarting(true)
    try {
      await startRoom(tableId, currentUid)
      await loadRoom()
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined
      setStartError(message || 'Start-game API is not available yet.')
    } finally { setIsStarting(false) }
  }
  if (loadError) return <main className="room-page"><div className="waiting-room"><h1>ROOM UNAVAILABLE</h1><p>{loadError}</p><button onClick={() => navigate('/room')}>BACK</button></div></main>
  if (!room) return <main className="room-page"><div className="waiting-room"><p>LOADING ROOM...</p></div></main>
  if (room.status === 'active') return <PlayroomPage room={room} />
  return <main className="room-page"><section className="waiting-room">
    <p className="waiting-label">SHARE THIS PIN WITH FRIENDS</p><h1>{room.tableId}</h1><p className="waiting-status">WAITING FOR PLAYERS · {room.currentPlayer}/{room.maxPlayer}</p>
    <div className="seat-list">{Array.from({ length: room.maxPlayer }, (_, index) => {
      const seat = room.players.find(player => player.seatNumber === index + 1)
      return <div className={seat ? 'seat occupied' : 'seat'} key={index}>{seat ? `${index + 1}. ${seat.username || 'Player'}` : `${index + 1}. Empty seat`}</div>
    })}</div>
    {currentUid === room.hostId && room.status === 'waiting' && <button className="start-game-button" onClick={() => void startGame()} disabled={isStarting}>{isStarting ? 'STARTING...' : 'START GAME'}</button>}
    {startError && <p className="start-error" role="alert">{startError}</p>}
    <p className="room-copy">{room.status === 'waiting' ? 'Only the host can start the game.' : 'Game has started. Connecting to the table...'}</p><button onClick={() => navigate('/lobby')}>BACK TO LOBBY</button>
  </section></main>
}

export default function RoomPage() {
  const navigate = useNavigate()
  const { tableId } = useParams()
  if (tableId) return <WaitingRoom tableId={tableId} />
  return <main className="room-page"><div className="overlay"><RoomForm onComplete={(id) => navigate(`/room/${id}`)} /></div></main>
}
