import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { firebaseAuth, googleProvider } from '../lib/firebase'

type PendingUser = { idToken: string }

function UsernameModal({ user, onSaved }: { user: PendingUser, onSaved: () => void }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = username.trim()
    if (value.length < 3 || value.length > 16) return setError('Username must be 3–16 characters.')
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return setError('Use letters, numbers, or _.')
    setIsSaving(true)
    try {
      await axios.post(`${import.meta.env.VITE_FIREBASE_API_KEY}/auth/profile`, { idToken: user.idToken, username: value })
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? 'Unable to save username.' : 'Unable to save username.')
    } finally {
      setIsSaving(false)
    }
  }
  return <div className="overlay"><form className="username-modal" onSubmit={submit}><h1>CREATE PROFILE</h1><p>Choose a username for the table.</p><label htmlFor="username">USERNAME</label><input id="username" value={username} onChange={event => setUsername(event.target.value)} maxLength={16} autoFocus autoComplete="username" />{error && <span className="username-error">{error}</span>}<button type="submit" disabled={isSaving}>{isSaving ? 'SAVING...' : 'CONTINUE'}</button></form></div>
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null)
  const login = async () => {
    setError('')
    setIsLoading(true)
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      const idToken = await result.user.getIdToken(true)
      const response = await axios.post<{ needsUsername: boolean }>(`${import.meta.env.VITE_FIREBASE_API_KEY}/auth/verify`, { idToken })
      if (response.data.needsUsername) setPendingUser({ idToken })
      else navigate('/lobby')
    } catch (loginError) {
      await signOut(firebaseAuth).catch(() => undefined)
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  return <main className="login-page"><div className="casino-bg" /><section className="login-card"><Logo /><p>HIGH STAKES · PIXEL PERFECT</p><div className="login-rule">INITIALIZE SECURE LINK</div><button className="google" onClick={login} disabled={isLoading}><b>G</b> {isLoading ? 'VERIFYING...' : 'CONTINUE WITH GOOGLE'}</button>{error && <p className="login-error">{error}</p>}<small>Secure connection via 256-bit encryption.</small></section>{pendingUser && <UsernameModal user={pendingUser} onSaved={() => navigate('/lobby')} />}</main>
}
