import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const COLORS = [
  '#4F46E5',
  '#0EA5A4',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#1F9D6B',
  '#E0503B',
  '#C7841A',
]

const emptyForm = { name: '', description: '', color: COLORS[0] }

export default function ProjectModal({ project, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setForm(project ? { ...emptyForm, ...project } : emptyForm)
    setErrors({})
  }, [project])

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
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight">
            {project ? 'Edit project' : 'New project'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5">
            <div className="mb-4">
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. DistroIQ"
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
              {fieldError('name') && (
                <p className="text-xs text-rose-600 mt-1">{fieldError('name')}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this product / project?"
                className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-500 mb-1.5">
                Color
              </label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      outline: form.color === c ? '2px solid #151823' : 'none',
                      outlineOffset: '2px',
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            {project ? (
              <button
                type="button"
                onClick={() => onDelete(project)}
                className="text-sm font-medium text-rose-600 hover:underline"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[10px] border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-[10px] bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
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
