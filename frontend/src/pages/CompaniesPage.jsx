import { useEffect, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import CompanyModal from '../components/CompanyModal'

export default function CompaniesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [companies, setCompanies] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)

  async function fetchCompanies() {
    setLoading(true)
    try {
      const { data } = await api.get('/companies', {
        params: { search: search || undefined },
      })
      setCompanies(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      api.get('/users').then(({ data }) => setUsers(data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    const timeout = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function openAddModal() {
    setEditingCompany(null)
    setModalOpen(true)
  }

  function openEditModal(company) {
    setEditingCompany(company)
    setModalOpen(true)
  }

  async function handleSave(form) {
    const payload = { ...form, owner_id: form.owner_id || null }
    if (editingCompany) {
      await api.put(`/companies/${editingCompany.id}`, payload)
    } else {
      await api.post('/companies', payload)
    }
    setModalOpen(false)
    fetchCompanies()
  }

  async function handleDelete(company) {
    if (!confirm(`Delete ${company.name}? This also detaches its contacts.`)) return
    await api.delete(`/companies/${company.id}`)
    fetchCompanies()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-72">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition"
          />
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-[10px] hover:bg-indigo-700 transition"
        >
          <Plus size={16} strokeWidth={2.5} /> Add company
        </button>
      </div>

      <div className="bg-white rounded-[14px] border border-slate-200 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)] overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 px-5 py-3 font-bold">Company</th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 px-5 py-3 font-bold">Industry</th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 px-5 py-3 font-bold">Website</th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 px-5 py-3 font-bold">Phone</th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 px-5 py-3 font-bold">Owner</th>
              <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 px-5 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No companies yet.
                </td>
              </tr>
            )}
            {!loading &&
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Building2 size={16} strokeWidth={2} />
                      </div>
                      <span className="font-semibold text-slate-900">
                        {company.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {company.industry || '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {company.website || '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {company.phone || '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {company.owner?.name || '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(company)}
                        className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(company)}
                        className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CompanyModal
          company={editingCompany}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
