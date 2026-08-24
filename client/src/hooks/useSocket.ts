import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useSocket() {
  const [socket] = useState<Socket>(() => io(socketUrl, { autoConnect: false }))

  useEffect(() => {
    socket.connect()

    return () => {
      socket.disconnect()
    }
  }, [socket])

  return socket
}
