import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

export default function LobbyPage() {
  const navigate = useNavigate()
  return <main className="lobby-page"><PageHeader /><section className="lobby-content"><h1>SELECT MODE</h1><div className="modes"><button className="mode friend" onClick={() => navigate('/room')}><span className="mode-icon">♟</span><b>Play with Friend</b><small>INVITE VIA CODE</small></button><button className="mode bot" onClick={() => alert('Practice mode is coming soon.')}><span className="mode-icon">♙</span><b>Play with Bot</b><small>PRACTICE OFFLINE</small></button></div></section><footer><button onClick={() => alert('Leaderboard is coming soon.')}>▥ LEADERBOARD</button></footer></main>
}
