import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import './App.css'
import { getAuthToken } from './lib/auth-token'
import { clearAuthToken } from './lib/auth-token'
import { firebaseAuth } from './lib/firebase'
import { verifyUser } from './features/auth/api/auth'

async function clearSession(): Promise<void> {
  clearAuthToken()
  if (firebaseAuth) await signOut(firebaseAuth).catch(() => undefined)
}

function hasAuthToken(): boolean {
  return Boolean(getAuthToken())
}

function EntryRoute() {
  return <Navigate to={hasAuthToken() ? '/lobby' : '/login'} replace />
}

function LoginRoute() {
  return hasAuthToken() ? <Navigate to="/lobby" replace /> : <LoginPage />
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    let isMounted = true

    const validateSession = async () => {
      const token = getAuthToken()
      if (!token) {
        if (isMounted) setIsChecking(false)
        return
      }

      try {
        const verification = await verifyUser(token)
        const validUser = !verification.needsUsername && Boolean(verification.user)
        if (isMounted) setIsValid(validUser)

        if (!validUser) {
          await clearSession()
        }
      } catch {
        await clearSession()
        if (isMounted) setIsValid(false)
      } finally {
        if (isMounted) setIsChecking(false)
      }
    }

    void validateSession()
    return () => {
      isMounted = false
    }
  }, [])

  if (isChecking) return <div className="grid min-h-screen place-items-center bg-[#126137] text-[#ffc23d]">LOADING...</div>
  return isValid ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return <Routes>
    <Route path="/" element={<EntryRoute />} />
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
    <Route path="/room" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
    <Route path="*" element={<EntryRoute />} />
  </Routes>
}

export default App
