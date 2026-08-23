import { useState } from 'react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import UsernameModal from '../features/auth/components/UsernameModal'
import { verifyUser } from '../features/auth/api/auth'
import type { AuthenticatedUser } from '../features/auth/types/auth'
import Logo from '../components/ui/Logo'
import { firebaseAuth, firebaseConfigError, googleProvider } from '../lib/firebase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(firebaseConfigError ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingUser, setPendingUser] = useState<AuthenticatedUser | null>(null)

  const login = async () => {
    if (!firebaseAuth || !googleProvider) {
      setError(firebaseConfigError ?? 'Firebase is not configured.')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      const idToken = await result.user.getIdToken(true)
      const { needsUsername } = await verifyUser(idToken)

      if (needsUsername) {
        setPendingUser({ idToken })
      } else {
        navigate('/lobby')
      }
    } catch (loginError) {
      await signOut(firebaseAuth).catch(() => undefined)
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <main className="login-page">
      <div className="casino-bg" />
      <section className="login-card">
        <Logo />
        <p>HIGH STAKES · PIXEL PERFECT</p>
        <div className="login-rule">INITIALIZE SECURE LINK</div>
        <button className="google" onClick={login} disabled={isLoading || !firebaseAuth || !googleProvider}>
          <b>G</b> {isLoading ? 'VERIFYING...' : 'CONTINUE WITH GOOGLE'}
        </button>
        {error && <p className="login-error">{error}</p>}
        <small>Secure connection via 256-bit encryption.</small>
      </section>
      {pendingUser && <UsernameModal user={pendingUser} onSaved={() => navigate('/lobby')} />}
    </main>
  )
}
