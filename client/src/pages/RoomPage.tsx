import { useNavigate } from 'react-router-dom'
import RoomForm from '../features/rooms/components/RoomForm'

export default function RoomPage() {
  const navigate = useNavigate()

  return (
    <main className="room-page">
      <div className="overlay">
        <RoomForm onComplete={() => navigate('/lobby')} />
      </div>
    </main>
  )
}
