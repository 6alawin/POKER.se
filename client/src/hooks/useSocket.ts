import { useEffect } from 'react'
import { io, type Socket } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const sharedSocket: Socket = io(socketUrl, { autoConnect: false })

export function useSocket() {
  useEffect(() => {
    if (!sharedSocket.connected) sharedSocket.connect()
  }, [])

  return sharedSocket
}
