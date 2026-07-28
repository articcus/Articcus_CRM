import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleSignInButton from '../components/GoogleSignInButton'
import api from '../api/client'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') || ''

  const [checkingInvite, setCheckingInvite] = useState(true)
  const [invite, setInvite] = useState(null)
  const [inviteError, setInviteError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!inviteToken) {
      setInviteError('This CRM is invite-only. Ask your admin for an invite link.')
      setCheckingInvite(false)
      return
    }
    api
      .get(`/invitations/${inviteToken}`)
      .then(({ data }) => {
        setInvite(data)
        setEmail(data.email)
      })
      .catch((err) => {
        setInviteError(
          err.response?.data?.reason || 'This invite link is invalid or has expired.'
        )
      })
      .finally(() => setCheckingInvite(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !password || !passwordConfirmation) {
      setError('Fill in all fields.')
      return
    }
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register(name, email, password, passwordConfirmation, inviteToken)
      navigate('/')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(
        errors ? Object.values(errors).flat().join(' ') : 'Registration failed'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-[18px] shadow-2xl border border-slate-100">
        <img src="/logo-articcus.png" alt="Articcus" className="h-8 w-auto mb-5" />

        {checkingInvite ? (
          <p className="text-sm text-slate-400">Checking your invite...</p>
        ) : inviteError ? (
          <>
            <p className="text-sm text-slate-500 mb-4">Create your account</p>
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mb-4">
              {inviteError}
            </div>
            <p className="text-sm text-slate-500 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="text-sm text-slate-500 mb-1">
              You've been invited as{' '}
              <span className="font-semibold text-slate-700 capitalize">{invite.role}</span>
            </p>
            <p className="text-sm text-slate-500 mb-6">Finish setting up your account</p>

            {error && (
              <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-4 rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />

            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full mb-4 rounded-[9px] border border-slate-200 bg-slate-50 text-slate-400 px-3 py-2.5 text-sm"
            />

            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-4 rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />

            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full mb-6 rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-[10px] py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>

            <GoogleSignInButton />

            <p className="mt-4 text-sm text-slate-500 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
