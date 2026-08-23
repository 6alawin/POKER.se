import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import ProfilePage from './pages/ProfilePage'
import RoomPage from './pages/RoomPage'
import './App.css'

function App() {
  return <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/lobby" element={<LobbyPage />} />
    <Route path="/room" element={<RoomPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default App
