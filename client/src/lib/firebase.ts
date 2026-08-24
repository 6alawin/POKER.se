import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

const hasPlaceholderValue = Object.values(firebaseConfig).some(value => !value || /^your_|your_|replace/i.test(value))

export const firebaseConfigError = hasPlaceholderValue
  ? 'Firebase client configuration is missing. Add the Web app values to client/.env, then restart Vite.'
  : null

const app = hasPlaceholderValue ? null : initializeApp(firebaseConfig)
export const firebaseAuth = app ? getAuth(app) : null
export const googleProvider = app ? new GoogleAuthProvider() : null
