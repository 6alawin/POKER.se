import { useState } from 'react'
import type { FormEvent } from 'react'
import { saveUsername } from '../api/auth'
import type { AuthenticatedUser } from '../types/auth'

type UsernameModalProps = {
  user: AuthenticatedUser
  onSaved: () => void
}

export default function UsernameModal({ user, onSaved }: UsernameModalProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const value = username.trim()
    if (value.length < 3 || value.length > 16) {
      setError('Username must be 3-16 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setError('Use letters, numbers, or _.')
      return
    }

    setIsSaving(true)
    try {
      await saveUsername(user, value)
      onSaved()
    } catch {
      setError('Unable to save username.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="overlay">
      <form className="username-modal" onSubmit={submit}>
        <h1>CREATE PROFILE</h1>
        <p>Choose a username for the table.</p>
        <label htmlFor="username">USERNAME</label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          maxLength={16}
          autoFocus
          autoComplete="username"
        />
        {error && <span className="username-error">{error}</span>}
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'SAVING...' : 'CONTINUE'}
        </button>
      </form>
    </div>
  )
}
