import { useState } from 'react'
import api from '../api/client'
import QuickCreateSelect from './QuickCreateSelect'

const TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
]

const emptyForm = { contact_id: '', type: 'task', subject: '', due_at: '', notes: '' }

export default function AddFollowUpModal({ contacts, companyId, onClose, onSaved, onContactCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const options = companyId ? contacts.filter((c) => c.company_id === companyId) : contacts

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    const validationErrors = {}
    if (!form.contact_id) {
      validationErrors.contact_id = ['Select a contact, or use Quick add to create one.']
    }
    if (!form.subject.trim()) {
      validationErrors.subject = ['Subject is required.']
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      await api.post('/activities', {
        contact_id: form.contact_id,
        type: form.type,
        subject: form.subject.trim(),
        due_at: form.due_at || null,
        notes: form.notes.trim() || null,
      })
      onSaved()
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    } finally {
      setSubmitting(false)
    }
  }

  function fieldError(field) {
    return errors[field]?.[0]
  }

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-start justify-center z-50 p-4 sm:p-10 overflow-y-auto">
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-md p-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 mb-4">
          Add follow-up
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <QuickCreateSelect
            label="Contact"
            required
            value={form.contact_id}
            onChange={(id) => setForm({ ...form, contact_id: id })}
            options={options}
            getLabel={(c) => (c.company ? `${c.name} (${c.company.name})` : c.name)}
            placeholder="Select a contact..."
            createPlaceholder="Contact name"
            onCreate={(name) =>
              api.post('/contacts', { name, company_id: companyId || null }).then((r) => r.data)
            }
            onCreated={onContactCreated}
            error={fieldError('contact_id')}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
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
                value={form.due_at}
                onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Subject
            </label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="What needs to happen..."
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
            {fieldError('subject') && (
              <p className="text-xs text-rose-600 mt-1">{fieldError('subject')}</p>
            )}
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-[10px] hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : 'Add follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
