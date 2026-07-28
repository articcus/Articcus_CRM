import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'
import { signInWithGoogle } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/me')
      .then(({ data }) => {
        setUser(data)
        localStorage.setItem('user', JSON.stringify(data))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function register(name, email, password, passwordConfirmation, inviteToken) {
    const { data } = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
      invite_token: inviteToken,
    })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function loginWithGoogle() {
    const idToken = await signInWithGoogle()
    const { data } = await api.post('/auth/firebase', { id_token: idToken })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function logout() {
    try {
      await api.post('/logout')
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
