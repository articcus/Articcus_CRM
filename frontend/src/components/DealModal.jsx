import { useEffect, useState } from 'react'
import api from '../api/client'
import ActivityTimeline from './ActivityTimeline'
import QuickCreateSelect from './QuickCreateSelect'

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

const emptyForm = {
  contact_id: '',
  project_id: '',
  title: '',
  value: '',
  stage: 'new',
  expected_close_date: '',
  notes: '',
  owner_id: '',
}

export default function DealModal({
  deal,
  contacts,
  projects = [],
  users,
  isAdmin,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm(
      deal
        ? {
            ...emptyForm,
            ...deal,
            contact_id: deal.contact_id ?? '',
            project_id: deal.project_id ?? '',
            owner_id: deal.owner_id ?? '',
            expected_close_date: deal.expected_close_date?.slice(0, 10) || '',
          }
        : emptyForm
    )
    setErrors({})
  }, [deal])

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    const validationErrors = {}
    if (!form.title.trim()) {
      validationErrors.title = ['Title is required.']
    }
    if (!form.contact_id) {
      validationErrors.contact_id = ['Select a contact, or use Quick add to create one.']
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      await onSave(form)
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
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 mb-4">
          {deal ? 'Edit deal' : 'Add deal'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              placeholder="e.g. Acme Corp — Website Redesign"
            />
            {fieldError('title') && (
              <p className="text-xs text-rose-600 mt-1">{fieldError('title')}</p>
            )}
          </div>

          <QuickCreateSelect
            label="Contact"
            required
            value={form.contact_id}
            onChange={(id) => setForm({ ...form, contact_id: id })}
            options={contacts}
            getLabel={(c) => (c.company ? `${c.name} (${c.company.name})` : c.name)}
            placeholder="Select a contact..."
            createPlaceholder="Contact name"
            onCreate={(name) => api.post('/contacts', { name }).then((r) => r.data)}
            error={fieldError('contact_id')}
          />

          <QuickCreateSelect
            label="Project"
            value={form.project_id}
            onChange={(id) => setForm({ ...form, project_id: id })}
            options={projects}
            placeholder="No project"
            createPlaceholder="Project name"
            onCreate={(name) => api.post('/projects', { name }).then((r) => r.data)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Value (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Stage
              </label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Expected close date
            </label>
            <input
              type="date"
              value={form.expected_close_date}
              onChange={(e) =>
                setForm({ ...form, expected_close_date: e.target.value })
              }
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Owner
              </label>
              <select
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            {deal ? (
              <button
                type="button"
                onClick={() => onDelete(deal)}
                className="text-sm font-medium text-rose-600 hover:underline"
              >
                Delete
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
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
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        {deal && <ActivityTimeline contactId={deal.contact_id} dealId={deal.id} />}
      </div>
    </div>
  )
}
