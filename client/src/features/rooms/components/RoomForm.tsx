import { useState } from 'react'
import axios from 'axios'
import { getAuthToken } from '../../../lib/auth-token'
import { verifyUser } from '../../auth/api/auth'
import { createRoom, joinRoom } from '../api'

type RoomTab = 'join' | 'create'

export default function RoomForm({ onComplete }: { onComplete: (tableId: string) => void }) {
  const [tab, setTab] = useState<RoomTab>('join')
  const [pin, setPin] = useState(['', '', '', ''])
  const [players, setPlayers] = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const appendPin = (digit: string) => setPin(current => {
    const next = [...current]
    const index = next.findIndex(value => !value)
    if (index >= 0) next[index] = digit
    return next
  })
  const erasePin = () => setPin(current => {
    const next = [...current]
    const index = next.map(Boolean).lastIndexOf(true)
    if (index >= 0) next[index] = ''
    return next
  })

  async function getUid() {
    const token = getAuthToken()
    if (!token) throw new Error('Your session has expired. Please sign in again.')
    const verification = await verifyUser(token)
    if (!verification.uid) throw new Error('Your session has expired. Please sign in again.')
    return verification.uid
  }

  async function submit() {
    setError('')
    setIsSubmitting(true)
    try {
      const uid = await getUid()
      const room = tab === 'create'
        ? await createRoom(uid, players)
        : await joinRoom(uid, pin.join(''))
      onComplete(room.tableId)
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined
      setError(message || (cause instanceof Error ? cause.message : 'Unable to enter the room. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeTab(nextTab: RoomTab) {
    setTab(nextTab)
    setError('')
  }

  const completePin = pin.every(Boolean)
  return <section className="room-modal" aria-label="Room settings">
    <div className="tabs">
      <button className={tab === 'join' ? 'selected' : ''} onClick={() => changeTab('join')}>JOIN ROOM</button>
      <button className={tab === 'create' ? 'selected' : ''} onClick={() => changeTab('create')}>CREATE ROOM</button>
    </div>
    <div className={`room-content ${tab}`}>
      <div className="pin-panel">
        <h2>{tab === 'join' ? 'Enter 4-Digit Room PIN' : 'Create a room for your friends'}</h2>
        {tab === 'join' ? <>
          <div className="pin-boxes">{pin.map((digit, index) => <span key={index}>{digit}</span>)}</div>
          <div className="keypad">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(number => <button key={number} onClick={() => appendPin(String(number))}>{number}</button>)}<button className="erase-key" onClick={erasePin} aria-label="Delete last digit">←</button></div>
        </> : <p className="room-copy">A unique 4-digit room PIN will be generated when you create the room.</p>}
      </div>
      <div className="settings-panel">
        <h2>{tab === 'join' ? 'Ready to play?' : 'Room Settings'}</h2>
        {tab === 'join' ? <p className="room-copy">Enter the PIN shared by the host to take an available seat.</p> : <div className="players"><strong>Max Players:</strong><div>{[2, 6, 9].map(value => <label key={value}><input type="radio" checked={players === value} onChange={() => setPlayers(value)} /> {value}</label>)}</div></div>}
      </div>
      {tab === 'join' && <button className="join-button" disabled={!completePin || isSubmitting} onClick={() => void submit()}>{isSubmitting ? 'JOINING...' : 'JOIN'}</button>}
    </div>
    {error && <p className="room-error" role="alert">{error}</p>}
    {tab === 'create' && <button className="create-button" disabled={isSubmitting} onClick={() => void submit()}>{isSubmitting ? 'CREATING...' : 'CREATE'}</button>}
  </section>
}
