import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api/client'

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

function inSevenDays() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export default function LogFollowUpModal({ activity, onClose, onSaved }) {
  const [note, setNote] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextDate, setNextDate] = useState(inSevenDays())
  const [stage, setStage] = useState(activity.deal?.stage || '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    try {
      if (note.trim()) {
        const existing = activity.notes ? `${activity.notes}\n` : ''
        await api.put(`/activities/${activity.id}`, {
          notes: `${existing}${note.trim()}`,
        })
      }
      await api.patch(`/activities/${activity.id}/complete`)

      if (nextAction.trim() && nextDate) {
        await api.post('/activities', {
          contact_id: activity.contact_id,
          deal_id: activity.deal_id || null,
          type: 'task',
          subject: nextAction.trim(),
          due_at: nextDate,
        })
      }

      if (activity.deal && stage && stage !== activity.deal.stage) {
        await api.patch(`/deals/${activity.deal.id}/stage`, { stage })
      }

      onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-start justify-center z-50 p-4 sm:p-10 overflow-y-auto">
      <div className="bg-white rounded-[18px] w-full max-w-[440px] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight">Log this touch</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[64vh] overflow-y-auto">
          <div className="mb-4">
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              What happened?
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Called, agreed to demo Tuesday"
              className="w-full rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 mt-5 mb-2 pt-4 border-t border-slate-100">
            Schedule the next follow-up
          </p>

          <div className="mb-4">
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Next action
            </label>
            <input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g. Run demo, send proposal"
              className="w-full rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
            {activity.deal && (
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                  Move to stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="text-[11.5px] text-slate-400 mt-4">
            Leave the next action blank if there's no next step (e.g. deal won or lost).
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[10px] border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2.5 rounded-[10px] bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Saving...' : 'Log & schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
