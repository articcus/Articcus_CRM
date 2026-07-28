import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = firebaseEnabled ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* env vars.')
  }
  const result = await signInWithPopup(auth, new GoogleAuthProvider())
  return result.user.getIdToken()
}
