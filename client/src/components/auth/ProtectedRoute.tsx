import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { clearAuthToken, getAuthToken } from '../../lib/auth-token'
import { firebaseAuth } from '../../lib/firebase'
import { verifyUser } from '../../features/auth/api/auth'

async function clearSession(): Promise<void> {
  clearAuthToken()
  if (firebaseAuth) await signOut(firebaseAuth).catch(() => undefined)
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function validateSession() {
      const token = getAuthToken()
      if (!token) {
        if (isMounted) setIsChecking(false)
        return
      }

      try {
        const verification = await verifyUser(token)
        const validUser = !verification.needsUsername && Boolean(verification.user)
        if (isMounted) setIsValid(validUser)
        if (!validUser) await clearSession()
      } catch {
        await clearSession()
        if (isMounted) setIsValid(false)
      } finally {
        if (isMounted) setIsChecking(false)
      }
    }

    void validateSession()
    return () => { isMounted = false }
  }, [])

  if (isChecking) return <div className="grid min-h-screen place-items-center bg-[#126137] text-[#ffc23d]">LOADING...</div>
  return isValid ? <>{children}</> : <Navigate to="/login" replace />
}
