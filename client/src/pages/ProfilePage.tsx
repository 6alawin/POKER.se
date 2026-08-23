import { useNavigate } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'

export default function ProfilePage() {
  const navigate = useNavigate()

  return (
    <main className="profile-page">
      <div className="overlay">
        <section className="profile-modal">
          <button className="close" onClick={() => navigate('/lobby')}>×</button>
          <h1>USER PROFILE</h1>
          <div className="profile-data">
            <Avatar />
            <div>
              <label>USERNAME</label>
              <div className="username">Player1</div>
            </div>
          </div>
          <button className="logout" onClick={() => navigate('/')}>LOG OUT</button>
        </section>
      </div>
    </main>
  )
}
