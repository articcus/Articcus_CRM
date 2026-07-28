import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm bg-white p-8 rounded-[18px] shadow-2xl border border-slate-100"
      >
        <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-indigo-600 to-violet-400 flex items-center justify-center text-white mb-4">
          <Sparkles size={22} strokeWidth={2} />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 mb-1">
          Articcus CRM
        </h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to your account</p>

        {error && (
          <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
        />

        <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white rounded-[10px] py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <GoogleSignInButton />

        <p className="mt-4 text-sm text-slate-500 text-center">
          No account?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}
