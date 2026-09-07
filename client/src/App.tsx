import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { getAuthToken } from './lib/auth-token'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const LobbyPage = lazy(() => import('./pages/LobbyPage'))
const RoomPage = lazy(() => import('./pages/RoomPage'))
const ProtectedRoute = lazy(() => import('./components/auth/ProtectedRoute'))

function hasAuthToken(): boolean {
  return Boolean(getAuthToken())
}

function EntryRoute() {
  return <Navigate to={hasAuthToken() ? '/lobby' : '/login'} replace />
}

function LoginRoute() {
  return hasAuthToken() ? <Navigate to="/lobby" replace /> : <PageLoader><LoginPage /></PageLoader>
}

function PageLoader({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#126137] text-[#ffc23d]">LOADING...</div>}>{children}</Suspense>
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return <PageLoader><ProtectedRoute>{children}</ProtectedRoute></PageLoader>
}

function App() {
  return <Routes>
    <Route path="/" element={<EntryRoute />} />
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/lobby" element={<ProtectedPage><LobbyPage /></ProtectedPage>} />
    <Route path="/room" element={<ProtectedPage><RoomPage /></ProtectedPage>} />
    <Route path="/room/:tableId" element={<ProtectedPage><RoomPage /></ProtectedPage>} />
    <Route path="*" element={<EntryRoute />} />
  </Routes>
}

export default App
