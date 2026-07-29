import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Copy, Check, Trash2, UserPlus } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function invitationStatus(invitation) {
  if (invitation.accepted_at) return { label: 'Accepted', style: 'bg-emerald-50 text-emerald-700' }
  if (new Date(invitation.expires_at) < new Date())
    return { label: 'Expired', style: 'bg-slate-100 text-slate-500' }
  return { label: 'Pending', style: 'bg-amber-50 text-amber-700' }
}

export default function TeamPage() {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('rep')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [newLink, setNewLink] = useState('')
  const [roleUpdateMessage, setRoleUpdateMessage] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  async function fetchAll() {
    setLoading(true)
    try {
      const [usersRes, invitationsRes] = await Promise.all([
        api.get('/users'),
        api.get('/invitations'),
      ])
      setUsers(usersRes.data)
      setInvitations(invitationsRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleInvite(e) {
    e.preventDefault()
    setError('')
    setNewLink('')
    setRoleUpdateMessage('')
    if (!email.trim()) {
      setError('Enter an email address.')
      return
    }

    setInviting(true)
    try {
      const { data } = await api.post('/invitations', { email: email.trim(), role })
      if (data.type === 'role_updated') {
        setRoleUpdateMessage(
          `${data.user.name} (${data.user.email}) already had an account — set to ${data.user.role}.`
        )
      } else {
        setNewLink(`${window.location.origin}/register?invite=${data.token}`)
      }
      setEmail('')
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.errors?.email?.[0] || 'Could not create invite.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(invitation) {
    if (!confirm(`Revoke the invite for ${invitation.email}?`)) return
    await api.delete(`/invitations/${invitation.id}`)
    fetchAll()
  }

  function copyLink(token, id) {
    const link = `${window.location.origin}/register?invite=${token}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 mb-4">
        Team
      </h2>

      <div className="bg-white border border-slate-200 rounded-[14px] p-5 mb-6 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
        <h3 className="font-display font-bold text-sm tracking-tight mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-600" /> Invite a team member
        </h3>
        <form onSubmit={handleInvite} noValidate className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 min-w-[200px] rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-600 transition"
          >
            <option value="rep">Rep</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2.5 rounded-[9px] bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}

        {roleUpdateMessage && (
          <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-[9px] px-3 py-2.5">
            {roleUpdateMessage}
          </div>
        )}

        {newLink && (
          <div className="mt-3 flex items-center gap-2 bg-indigo-50 rounded-[9px] px-3 py-2.5">
            <input
              readOnly
              value={newLink}
              className="flex-1 bg-transparent text-xs font-mono text-indigo-700 outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newLink)
              }}
              className="text-indigo-600 hover:text-indigo-800 shrink-0"
              title="Copy link"
            >
              <Copy size={15} />
            </button>
          </div>
        )}
        {newLink && (
          <p className="text-[11.5px] text-slate-400 mt-1.5">
            Share this link with them — it's the only way to accept this invite. Valid for 7 days.
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)] mb-6">
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="font-display font-bold text-sm tracking-tight">Members</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {loading && <p className="px-5 py-6 text-sm text-slate-400">Loading...</p>}
          {!loading &&
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center shrink-0">
                  {initials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                  {u.role}
                </span>
              </div>
            ))}
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="font-display font-bold text-sm tracking-tight">Invitations</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {invitations.map((invitation) => {
              const status = invitationStatus(invitation)
              return (
                <div key={invitation.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                    <p className="text-xs text-slate-400">
                      {invitation.role} · invited by {invitation.inviter?.name || '—'}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${status.style}`}>
                    {status.label}
                  </span>
                  {status.label === 'Pending' && (
                    <button
                      onClick={() => copyLink(invitation.token, invitation.id)}
                      title="Copy invite link"
                      className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      {copiedId === invitation.id ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                  {!invitation.accepted_at && (
                    <button
                      onClick={() => handleRevoke(invitation)}
                      title="Revoke"
                      className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
