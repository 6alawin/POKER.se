import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { signOut } from 'firebase/auth'
import Avatar from '../ui/Avatar'
import Logo from '../ui/Logo'
import { onIdTokenChanged, type User } from 'firebase/auth'
import { firebaseAuth } from '../../lib/firebase'
import { saveUsername, verifyUser } from '../../features/auth/api/auth'
import { clearAuthToken, saveAuthToken } from '../../lib/auth-token'

const styles = {
  header: '!z-30 !min-h-0 !basis-[clamp(76px,12vh,112px)] !px-[clamp(16px,6vw,64px)] !py-[clamp(10px,2vh,20px)]',
  trigger: 'relative z-40',
  headerAvatar: '!h-[clamp(64px,7vw,96px)] !w-[clamp(64px,7vw,96px)] !shrink-0',
  modal: 'absolute left-0 top-[calc(100%+12px)] z-50 w-[min(420px,calc(100vw-32px))] border-4 border-[#ffc23d] bg-[#292b2c] p-5 text-white shadow-[-6px_6px_#151515] max-[700px]:w-[min(320px,calc(100vw-32px))] max-[700px]:p-4',
  profileGrid: '!grid grid-cols-[128px_minmax(0,1fr)] items-center gap-5 max-[700px]:grid-cols-[92px_minmax(0,1fr)] max-[700px]:gap-3',
  modalAvatar: '!h-[128px] !w-[128px] !shrink-0 !text-[48px] max-[700px]:!h-[92px] max-[700px]:!w-[92px] max-[700px]:!text-[34px]',
  actionButton: 'cursor-pointer border-2 border-[#6f5d39] bg-[#232526] px-1 py-1 text-[8px] text-[#ffd18a]',
  logoutButton: 'relative z-20 mt-[18px] block w-full cursor-pointer border-2 border-[#ed746b] bg-[#b63e37] px-2.5 py-2 text-[9px] text-white',
} as const

export default function PageHeader() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [username, setUsername] = useState('Loading...')
  const [uid, setUid] = useState('')
  const [idToken, setIdToken] = useState('')
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [editedUsername, setEditedUsername] = useState('')
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (!firebaseAuth) {
      setUsername('Guest')
      return
    }

    let isMounted = true
    let hasReceivedAuthEvent = false

    const syncProfile = async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        if (isMounted) {
          setUsername('Guest')
          setUid('')
          setIdToken('')
        }
        clearAuthToken()
        return
      }

      if (isMounted) setUid(firebaseUser.uid)
      try {
        const token = await firebaseUser.getIdToken()
        saveAuthToken(token)
        if (isMounted) setIdToken(token)
        const verification = await verifyUser(token)
        if (isMounted) setUsername(verification.user?.username ?? verification.username ?? 'Guest')
      } catch {
        if (isMounted) setUsername(firebaseUser.displayName ?? 'Guest')
      }
    }

    const unsubscribe = onIdTokenChanged(firebaseAuth, (firebaseUser) => {
      hasReceivedAuthEvent = true
      void syncProfile(firebaseUser)
    })

    // Firebase may already have restored the session before this component mounts.
    if (firebaseAuth.currentUser) void syncProfile(firebaseAuth.currentUser)

    // Never leave the header stuck on Loading if Firebase has no signed-in user.
    const fallback = window.setTimeout(() => {
      if (isMounted && !hasReceivedAuthEvent) setUsername('Guest')
    }, 3000)

    return () => {
      isMounted = false
      window.clearTimeout(fallback)
      unsubscribe()
    }
  }, [])

  const startEditingUsername = () => {
    setEditedUsername(username)
    setProfileError('')
    setIsEditingUsername(true)
  }

  const updateUsername = async () => {
    const nextUsername = editedUsername.trim()
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(nextUsername)) {
      setProfileError('Username must be 3-16 letters, numbers, or _.')
      return
    }

    const currentToken = firebaseAuth?.currentUser
      ? await firebaseAuth.currentUser.getIdToken(true)
      : idToken
    if (!currentToken) {
      setProfileError('Please login again before editing username.')
      return
    }

    setIsSavingUsername(true)
    try {
      saveAuthToken(currentToken)
      setIdToken(currentToken)
      await saveUsername({ idToken: currentToken }, nextUsername)
      setUsername(nextUsername)
      setIsEditingUsername(false)
      setProfileError('')
    } catch {
      setProfileError('Unable to save username.')
    } finally {
      setIsSavingUsername(false)
    }
  }

  const logout = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    clearAuthToken()
    window.location.replace('/login')

    if (firebaseAuth) {
      void signOut(firebaseAuth).catch((error) => {
        console.error('LOGOUT ERROR:', error)
      })
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.trigger}>
        <button className="user" onClick={() => setIsProfileOpen((open) => !open)} aria-expanded={isProfileOpen}>
          <Avatar className={styles.headerAvatar} />
          <span>
            <b className="!font-['VT323'] !text-[clamp(22px,2vw,30px)] !leading-none">{username}</b>
            <small className="!font-['VT323'] !text-[clamp(16px,1.4vw,22px)]">{uid}</small>
          </span>
        </button>
        {isProfileOpen && (
          <section className={styles.modal} aria-label="User profile" onClick={(event) => event.stopPropagation()}>
            <h2 className="mb-[18px] !font-['VT323'] !text-[22px] font-bold text-[#ffc23d] underline">USER PROFILE</h2>
            <div className={styles.profileGrid}>
              <div className="group relative size-[128px] cursor-default max-[700px]:size-[92px]" title="Profile image editing coming soon">
                <Avatar className={styles.modalAvatar} />
                <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/70 text-[32px] text-white opacity-0 transition-opacity group-hover:opacity-100">✎</span>
              </div>
              <div className="!flex min-w-0 !flex-col items-start gap-2">
                <div className="w-full">
                  <label className="mb-1 block text-[12px] text-[#d8c79e] underline">USERNAME</label>
                {isEditingUsername ? (
                  <div className="flex w-full gap-[5px]">
                    <input
                      className="min-w-0 flex-1 border-2 border-[#ffc23d] bg-[#151516] p-[5px] font-['VT323'] text-[16px] text-white"
                      value={editedUsername}
                      onChange={(event) => setEditedUsername(event.target.value)}
                      maxLength={16}
                      autoFocus
                    />
                    <button className="border-2 border-[#6f5d39] bg-[#232526] px-2 py-[5px] text-[9px] text-[#ffd18a] enabled:cursor-pointer" type="button" onClick={updateUsername} disabled={isSavingUsername}>
                      {isSavingUsername ? '...' : 'SAVE'}
                    </button>
                  </div>
                ) : (
                  <>
                    <strong className="overflow-hidden text-ellipsis whitespace-nowrap font-['VT323'] text-[24px] text-white">{username}</strong>
                    <button type="button" className={`mt-2 !text-[12px] ${styles.actionButton}`} onClick={startEditingUsername}>EDIT USERNAME</button>
                  </>
                )}
                {profileError && <small className="block font-['VT323'] text-[15px] text-[#ff9d95]">{profileError}</small>}
                </div>
              </div>
            </div>
            <button type="button" className={`${styles.logoutButton} !font-['VT323'] !text-[20px]`} onClick={logout}>LOG OUT</button>
          </section>
        )}
      </div>
      <Logo showWordmark />
    </header>
  )
}
