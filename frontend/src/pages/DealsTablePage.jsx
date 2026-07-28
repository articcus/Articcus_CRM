import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DealModal from '../components/DealModal'
import { formatCurrency } from '../lib/format'

const STAGES = [
  { value: '', label: 'All stages' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

const STAGE_STYLE = {
  new: { bg: '#EEF0F6', fg: '#5B647A' },
  contacted: { bg: '#EEEDFD', fg: '#6366F1' },
  qualified: { bg: '#E4F5F5', fg: '#0EA5A4' },
  proposal: { bg: '#FBF2E0', fg: '#C7841A' },
  won: { bg: '#E6F5EE', fg: '#1F9D6B' },
  lost: { bg: '#EEF0F6', fg: '#96A0B3' },
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function DealsTablePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [deals, setDeals] = useState([])
  const [contacts, setContacts] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [editingDeal, setEditingDeal] = useState(null)

  async function fetchDeals() {
    setLoading(true)
    try {
      const { data } = await api.get('/deals', {
        params: { stage: stage || undefined },
      })
      setDeals(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  useEffect(() => {
    api.get('/contacts').then(({ data }) => setContacts(data.data))
    api.get('/projects').then(({ data }) => setProjects(data))
    if (isAdmin) {
      api.get('/users').then(({ data }) => setUsers(data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function handleSave(form) {
    const payload = {
      ...form,
      project_id: form.project_id || null,
      value: form.value || 0,
      expected_close_date: form.expected_close_date || null,
      owner_id: form.owner_id || null,
    }
    await api.put(`/deals/${editingDeal.id}`, payload)
    setEditingDeal(null)
    fetchDeals()
  }

  async function handleDelete(deal) {
    if (!confirm(`Delete "${deal.title}"?`)) return
    await api.delete(`/deals/${deal.id}`)
    setEditingDeal(null)
    fetchDeals()
  }

  const filtered = deals.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.title.toLowerCase().includes(q) ||
      d.contact?.name?.toLowerCase().includes(q) ||
      d.contact?.company?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-[9px] border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-600 transition"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 text-left px-4 py-3 font-bold">
                Company
              </th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 text-left px-4 py-3 font-bold">
                Deal
              </th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 text-left px-4 py-3 font-bold">
                Project
              </th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 text-left px-4 py-3 font-bold">
                Stage
              </th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 text-left px-4 py-3 font-bold">
                Value
              </th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 text-left px-4 py-3 font-bold">
                Expected close
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10">
                  No deals match.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((deal) => {
                const style = STAGE_STYLE[deal.stage]
                return (
                  <tr
                    key={deal.id}
                    onClick={() => setEditingDeal(deal)}
                    className="border-b border-slate-100 last:border-none cursor-pointer hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 font-semibold">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: style.fg }}
                        />
                        {deal.contact?.company?.name || deal.contact?.name || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 pl-4">
                        {deal.contact?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-[220px] truncate">
                      {deal.title}
                    </td>
                    <td className="px-4 py-3.5">
                      {deal.project ? (
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: deal.project.color }}
                          />
                          {deal.project.name}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                        style={{ backgroundColor: style.bg, color: style.fg }}
                      >
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {formatCurrency(deal.value)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {fmtDate(deal.expected_close_date)}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {editingDeal && (
        <DealModal
          deal={editingDeal}
          contacts={contacts}
          projects={projects}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setEditingDeal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
