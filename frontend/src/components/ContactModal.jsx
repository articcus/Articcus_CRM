import { useEffect, useState } from 'react'
import api from '../api/client'
import ActivityTimeline from './ActivityTimeline'
import QuickCreateSelect from './QuickCreateSelect'
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '../lib/leadStatus'

const emptyForm = {
  company_id: '',
  lead_status: 'mql',
  name: '',
  email: '',
  phone: '',
  title: '',
  notes: '',
  owner_id: '',
}

export default function ContactModal({
  contact,
  companies,
  users,
  isAdmin,
  onClose,
  onSave,
  onCompanyCreated,
}) {
  const [currentContact, setCurrentContact] = useState(contact)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    setCurrentContact(contact)
    setForm(
      contact
        ? {
            ...emptyForm,
            ...contact,
            company_id: contact.company_id ?? '',
            owner_id: contact.owner_id ?? '',
            lead_status: contact.lead_status ?? 'mql',
          }
        : emptyForm
    )
    setErrors({})
  }, [contact])

  async function handleQuickAssign(ownerId) {
    setAssigning(true)
    try {
      const { data } = await api.put(`/contacts/${currentContact.id}`, {
        owner_id: ownerId || null,
      })
      setCurrentContact(data)
      setForm((f) => ({ ...f, owner_id: data.owner_id ?? '' }))
    } finally {
      setAssigning(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    if (!form.name.trim()) {
      setErrors({ name: ['Name is required.'] })
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
          {contact ? 'Edit contact' : 'Add contact'}
        </h2>

        {contact && isAdmin && (
          <div className="flex items-center justify-between bg-slate-50 rounded-[10px] px-3 py-2.5 mb-3">
            <span className="text-[11.5px] font-semibold text-slate-500">Assigned to</span>
            <select
              value={currentContact?.owner_id ?? ''}
              onChange={(e) => handleQuickAssign(e.target.value)}
              disabled={assigning}
              className="text-sm font-medium text-slate-700 border border-slate-200 rounded-[8px] px-2 py-1 bg-white focus:outline-none focus:border-indigo-600 disabled:opacity-60 transition"
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

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
            {fieldError('name') && (
              <p className="text-xs text-rose-600 mt-1">{fieldError('name')}</p>
            )}
          </div>

          <QuickCreateSelect
            label="Company"
            value={form.company_id}
            onChange={(id) => setForm({ ...form, company_id: id })}
            options={companies}
            placeholder="No company"
            createPlaceholder="Company name"
            onCreate={(name) => api.post('/companies', { name }).then((r) => r.data)}
            onCreated={onCompanyCreated}
          />

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Lead status
            </label>
            <select
              value={form.lead_status}
              onChange={(e) => setForm({ ...form, lead_status: e.target.value })}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
              {fieldError('email') && (
                <p className="text-xs text-rose-600 mt-1">{fieldError('email')}</p>
              )}
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Phone
              </label>
              <input
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
              Title
            </label>
            <input
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              placeholder="e.g. VP of Sales"
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

          {!contact && isAdmin && (
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
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>

        {contact && <ActivityTimeline contactId={contact.id} />}
      </div>
    </div>
  )
}
