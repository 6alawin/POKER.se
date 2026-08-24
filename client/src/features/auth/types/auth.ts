export type AuthenticatedUser = {
  idToken: string
}

export type AuthVerification = {
  needsUsername: boolean
  uid?: string
  email?: string | null
  username?: string | null
  user?: {
    uid: string
    email: string | null
    username: string | null
    current_card_skin: string | null
    current_table_skin: string | null
    picture_id: string | null
  } | null
}
