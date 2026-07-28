import { useState } from 'react'
import { Plus, X } from 'lucide-react'

export default function QuickCreateSelect({
  label,
  value,
  onChange,
  options,
  getLabel = (o) => o.name,
  placeholder = 'None',
  onCreate,
  createPlaceholder = 'Name',
  required = false,
  error,
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [extra, setExtra] = useState([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const allOptions = [...options, ...extra]

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const created = await onCreate(newName.trim())
      setExtra((prev) => [...prev, created])
      onChange(String(created.id))
      setNewName('')
      setAdding(false)
    } catch (err) {
      setCreateError(err.response?.data?.errors?.name?.[0] || 'Could not create')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[11.5px] font-semibold text-slate-500">{label}</label>
        <button
          type="button"
          onClick={() => {
            setAdding((a) => !a)
            setCreateError('')
          }}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
        >
          {adding ? <X size={11} /> : <Plus size={11} />}
          {adding ? 'Cancel' : 'Quick add'}
        </button>
      </div>

      {adding ? (
        <>
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder={createPlaceholder}
              className="flex-1 rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-3.5 rounded-[9px] bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {creating ? '...' : 'Add'}
            </button>
          </div>
          {createError && <p className="text-xs text-rose-600 mt-1">{createError}</p>}
        </>
      ) : (
        <>
          <select
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-[9px] border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
          >
            <option value="">{placeholder}</option>
            {allOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {getLabel(o)}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </>
      )}
    </div>
  )
}
