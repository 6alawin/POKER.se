import { apiClient } from '../../../lib/api'
import type { AuthVerification, AuthenticatedUser } from '../types/auth'

export async function verifyUser(idToken: string) {
  const response = await apiClient.post<AuthVerification>('/auth/verify', { idToken })
  return response.data
}

export async function saveUsername(user: AuthenticatedUser, username: string) {
  await apiClient.post('/auth/profile', {
    idToken: user.idToken,
    username,
  })
}
