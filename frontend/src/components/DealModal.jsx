import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import api from '../api/client'
import ActivityTimeline from './ActivityTimeline'
import QuickCreateSelect from './QuickCreateSelect'
import { formatCurrency } from '../lib/format'

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

const STAGE_META = {
  new: { label: 'New', bg: '#EEF0F6', fg: '#5B647A' },
  contacted: { label: 'Contacted', bg: '#EEEDFD', fg: '#6366F1' },
  qualified: { label: 'Qualified', bg: '#E4F5F5', fg: '#0EA5A4' },
  proposal: { label: 'Proposal', bg: '#FBF2E0', fg: '#C7841A' },
  won: { label: 'Won', bg: '#E6F5EE', fg: '#1F9D6B' },
  lost: { label: 'Lost', bg: '#EEF0F6', fg: '#96A0B3' },
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

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
  onContactCreated,
  onProjectCreated,
}) {
  const [currentDeal, setCurrentDeal] = useState(deal)
  const [mode, setMode] = useState(deal ? 'view' : 'edit')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    setCurrentDeal(deal)
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
    setMode(deal ? 'view' : 'edit')
  }, [deal])

  async function handleQuickAssign(ownerId) {
    setAssigning(true)
    try {
      const { data } = await api.put(`/deals/${currentDeal.id}`, { owner_id: ownerId || null })
      setCurrentDeal(data)
    } finally {
      setAssigning(false)
    }
  }

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

  function cancelEdit() {
    if (currentDeal) {
      setForm({
        ...emptyForm,
        ...currentDeal,
        contact_id: currentDeal.contact_id ?? '',
        project_id: currentDeal.project_id ?? '',
        owner_id: currentDeal.owner_id ?? '',
        expected_close_date: currentDeal.expected_close_date?.slice(0, 10) || '',
      })
      setErrors({})
      setMode('view')
    } else {
      onClose()
    }
  }

  if (mode === 'view' && currentDeal) {
    const deal = currentDeal
    const meta = STAGE_META[deal.stage] ?? STAGE_META.new

    return (
      <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-start justify-center z-50 p-4 sm:p-10 overflow-y-auto">
        <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 truncate">
                  {deal.title}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  {deal.contact?.name || 'No contact'}
                  {deal.contact?.company?.name && ` · ${deal.contact.company.name}`}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center flex-wrap gap-1.5 mt-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                style={{ backgroundColor: meta.bg, color: meta.fg }}
              >
                {meta.label}
              </span>
              {deal.project && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 bg-slate-100">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: deal.project.color }}
                  />
                  {deal.project.name}
                </span>
              )}
            </div>
          </div>

          <div className="px-6 py-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 mb-1">
                  Value
                </p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {formatCurrency(deal.value)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 mb-1">
                  Expected close
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {fmtDate(deal.expected_close_date)}
                </p>
              </div>
              {isAdmin && (
                <div>
                  <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 mb-1">
                    Owner
                  </p>
                  <select
                    value={deal.owner_id ?? ''}
                    onChange={(e) => handleQuickAssign(e.target.value)}
                    disabled={assigning}
                    className="w-full text-sm font-medium text-slate-700 border border-slate-200 rounded-[8px] px-2 py-1.5 bg-white focus:outline-none focus:border-indigo-600 disabled:opacity-60 transition"
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
            </div>

            {deal.notes && (
              <div className="mt-4">
                <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 mb-1">
                  Notes
                </p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}

            <ActivityTimeline contactId={deal.contact_id} dealId={deal.id} />
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
            <button
              type="button"
              onClick={() => onDelete(deal)}
              className="text-sm font-medium text-rose-600 hover:underline"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-[10px] hover:bg-indigo-700 transition"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    )
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
            onCreated={onContactCreated}
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
            onCreated={onProjectCreated}
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
                onClick={cancelEdit}
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
      </div>
    </div>
  )
}
