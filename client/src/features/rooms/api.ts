import { apiClient } from '../../lib/api'

export type RoomSummary = {
  tableId: string
  hostId: string
  status: string
  maxPlayer: number
  currentPlayer: number
  seatNumber?: number
}

export type RoomDetails = RoomSummary & {
  players: Array<{ uid: string; username: string | null; pictureId: string | null; seatNumber: number }>
}

export async function createRoom(uid: string, maxPlayers: number) {
  const response = await apiClient.post<{ room: RoomSummary }>('/api/rooms', { uid, maxPlayers })
  return response.data.room
}

export async function joinRoom(uid: string, tableId: string) {
  const response = await apiClient.post<{ room: RoomSummary }>(`/api/rooms/${tableId}/join`, { uid })
  return response.data.room
}

export async function getRoom(tableId: string) {
  const response = await apiClient.get<{ room: RoomDetails }>(`/api/rooms/${tableId}`)
  return response.data.room
}

// Implement this endpoint in the game backend. The caller sends the host uid
// so the server can enforce that only the room host starts a waiting room.
export async function startRoom(tableId: string, uid: string) {
  await apiClient.post(`/api/rooms/${tableId}/start`, { uid })
}
