import { useState } from 'react'
import { X, Phone, Mail, CalendarClock, CheckSquare, Check } from 'lucide-react'
import api from '../api/client'

const TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: CalendarClock },
  { value: 'task', label: 'Task', icon: CheckSquare },
]

function toLocalInput(value) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TaskDetailModal({ activity, onClose, onUpdated, onDeleted }) {
  const [type, setType] = useState(activity.type)
  const [subject, setSubject] = useState(activity.subject)
  const [notes, setNotes] = useState(activity.notes || '')
  const [dueAt, setDueAt] = useState(toLocalInput(activity.due_at))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingComplete, setTogglingComplete] = useState(false)

  const done = Boolean(activity.completed_at)

  async function handleSave() {
    setError('')
    if (!subject.trim()) {
      setError('Subject is required.')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put(`/activities/${activity.id}`, {
        type,
        subject: subject.trim(),
        notes: notes.trim() || null,
        due_at: dueAt || null,
      })
      onUpdated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.errors?.subject?.[0] || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleComplete() {
    setTogglingComplete(true)
    try {
      const { data } = await api.patch(`/activities/${activity.id}/complete`)
      onUpdated(data)
    } finally {
      setTogglingComplete(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    try {
      await api.delete(`/activities/${activity.id}`)
      onDeleted(activity.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const Icon = TYPES.find((t) => t.value === type)?.icon ?? CheckSquare

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-start justify-center z-[60] p-4 sm:p-10 overflow-y-auto">
      <div className="bg-white rounded-[18px] w-full max-w-[440px] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
            <Icon size={17} className="text-indigo-600" /> Task details
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[64vh] overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Due
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={togglingComplete}
            className={`w-full flex items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              done
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Check size={15} strokeWidth={2.5} />
            {done ? 'Completed — mark as pending' : 'Mark as complete'}
          </button>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-rose-600 hover:underline disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-[10px] hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
