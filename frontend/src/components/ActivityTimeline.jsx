import { useEffect, useState } from 'react'
import { Phone, Mail, CalendarClock, CheckSquare, Check, X } from 'lucide-react'
import api from '../api/client'

const TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: CalendarClock },
  { value: 'task', label: 'Task', icon: CheckSquare },
]

const emptyForm = { type: 'task', subject: '', notes: '', due_at: '' }

export default function ActivityTimeline({ contactId, dealId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState('')

  async function fetchActivities() {
    setLoading(true)
    try {
      const { data } = await api.get('/activities', {
        params: dealId ? { deal_id: dealId } : { contact_id: contactId },
      })
      setActivities(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, dealId])

  async function handleAdd(e) {
    e.preventDefault()
    setAddError('')

    if (!form.subject.trim()) {
      setAddError('Subject is required.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/activities', {
        contact_id: contactId,
        deal_id: dealId || null,
        type: form.type,
        subject: form.subject,
        notes: form.notes || null,
        due_at: form.due_at || null,
      })
      setForm(emptyForm)
      fetchActivities()
    } catch (err) {
      setAddError(err.response?.data?.errors?.subject?.[0] || 'Could not log activity.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleComplete(activity) {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activity.id
          ? { ...a, completed_at: a.completed_at ? null : new Date().toISOString() }
          : a
      )
    )
    await api.patch(`/activities/${activity.id}/complete`)
  }

  async function handleDelete(activity) {
    await api.delete(`/activities/${activity.id}`)
    fetchActivities()
  }

  return (
    <div className="border-t border-slate-100 pt-4 mt-4">
      <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 mb-2">
        Activity
      </p>

      <form onSubmit={handleAdd} noValidate className="flex flex-wrap gap-2 mb-3">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-600 transition"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          placeholder="What happened / what's needed..."
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="flex-1 min-w-[140px] rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-600 transition"
        />
        <input
          type="datetime-local"
          value={form.due_at}
          onChange={(e) => setForm({ ...form, due_at: e.target.value })}
          className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-600 transition"
        />
        <button
          type="submit"
          disabled={submitting}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-[8px] hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          Log
        </button>
      </form>
      {addError && <p className="text-xs text-rose-600 -mt-2 mb-3">{addError}</p>}

      <div className="max-h-48 overflow-y-auto space-y-1.5">
        {loading && <p className="text-xs text-slate-400">Loading...</p>}
        {!loading && activities.length === 0 && (
          <p className="text-xs text-slate-400">No activity yet.</p>
        )}
        {!loading &&
          activities.map((activity) => {
            const type = TYPES.find((t) => t.value === activity.type)
            const Icon = type?.icon ?? CheckSquare
            const done = Boolean(activity.completed_at)
            return (
              <div
                key={activity.id}
                className="flex items-start gap-2.5 text-xs bg-slate-50 rounded-[10px] px-2.5 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggleComplete(activity)}
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {done && <Check size={10} strokeWidth={3} />}
                </button>
                <Icon size={13} className="mt-0.5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p
                    className={`truncate ${activity.completed_at ? 'line-through text-slate-400' : 'text-slate-700'}`}
                  >
                    {activity.subject}
                  </p>
                  {activity.due_at && (
                    <p className="text-slate-400">
                      Due{' '}
                      {new Date(activity.due_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(activity)}
                  className="text-slate-300 hover:text-rose-600 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}
