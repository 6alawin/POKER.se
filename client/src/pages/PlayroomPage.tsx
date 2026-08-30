import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/ui/Logo'
import type { RoomDetails } from '../features/rooms/api'
import cowboy from '../assets/picture_profile/cowboy.png'
import wizard from '../assets/picture_profile/wizard.png'
import undertaker from '../assets/picture_profile/undertaker.png'
import plagueDoctor from '../assets/picture_profile/plague-doctor.png'
import iceFishing from '../assets/picture_profile/ice-fishing.png'
import pineTree from '../assets/picture_profile/pine-tree.webp'
import cherryTree from '../assets/picture_profile/cherry-tree.webp'

const profileImages: Record<string, string> = {
  cowboy, wizard, undertaker, 'plague-doctor': plagueDoctor,
  'ice-fishing': iceFishing, 'pine-tree': pineTree, 'cherry-tree': cherryTree,
}

export default function PlayroomPage({ room }: { room: RoomDetails }) {
  const navigate = useNavigate()
  return <main className="playroom-page">
    <header className="playroom-header"><Logo showWordmark /><div><b>TABLE {room.tableId}</b><small>{room.currentPlayer}/{room.maxPlayer} PLAYERS</small></div><button onClick={() => navigate('/lobby')}>LEAVE</button></header>
    <section className="table-area" aria-label={`Poker table ${room.tableId}`}>
      <div className="poker-table"><div className="table-felt"><span>POKER.se</span><small>WAITING FOR THE NEXT HAND</small></div>
        {room.players.map(player => {
          const angle = -90 + ((player.seatNumber - 1) * 360) / room.maxPlayer
          const radians = (angle * Math.PI) / 180
          const style = { left: `${50 + Math.cos(radians) * 45}%`, top: `${50 + Math.sin(radians) * 47}%` } as CSSProperties
          return <article className="table-seat" style={style} key={player.uid}>
            <img src={profileImages[player.pictureId || 'cowboy'] || cowboy} alt="" />
            <strong>{player.username || 'Player'}</strong><small>SEAT {player.seatNumber}</small>
          </article>
        })}
      </div>
    </section>
    <p className="playroom-notice">YOU ARE IN THE GAME ROOM · GAMEPLAY WILL APPEAR HERE NEXT</p>
  </main>
}
