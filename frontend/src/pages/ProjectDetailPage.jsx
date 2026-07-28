import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ProjectModal from '../components/ProjectModal'
import DealModal from '../components/DealModal'
import ActivityTimeline from '../components/ActivityTimeline'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'

const STAGE_STYLE = {
  new: { bg: '#EEF0F6', fg: '#5B647A' },
  contacted: { bg: '#EEEDFD', fg: '#6366F1' },
  qualified: { bg: '#E4F5F5', fg: '#0EA5A4' },
  proposal: { bg: '#FBF2E0', fg: '#C7841A' },
  won: { bg: '#E6F5EE', fg: '#1F9D6B' },
  lost: { bg: '#EEF0F6', fg: '#96A0B3' },
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [addingDeal, setAddingDeal] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)
  const [contacts, setContacts] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])

  function fetchProject() {
    setLoading(true)
    setNotFound(false)
    return api
      .get(`/projects/${id}`)
      .then(({ data }) => setProject(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProject()
    api.get('/contacts').then(({ data }) => setContacts(data.data))
    api.get('/projects').then(({ data }) => setProjects(data))
    if (isAdmin) {
      api.get('/users').then(({ data }) => setUsers(data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAdmin])

  async function handleSaveProject(form) {
    await api.put(`/projects/${id}`, form)
    setEditingProject(false)
    fetchProject()
  }

  async function handleDeleteProject(p) {
    if (!confirm(`Delete project "${p.name}"? Deals stay, just unassigned.`)) return
    await api.delete(`/projects/${p.id}`)
    navigate('/')
  }

  async function handleAddDeal(form) {
    const payload = {
      ...form,
      project_id: form.project_id || Number(id),
      value: form.value || 0,
      expected_close_date: form.expected_close_date || null,
      owner_id: form.owner_id || null,
    }
    await api.post('/deals', payload)
    setAddingDeal(false)
    fetchProject()
  }

  async function handleEditDeal(form) {
    const payload = {
      ...form,
      project_id: form.project_id || null,
      value: form.value || 0,
      expected_close_date: form.expected_close_date || null,
      owner_id: form.owner_id || null,
    }
    await api.put(`/deals/${editingDeal.id}`, payload)
    setEditingDeal(null)
    fetchProject()
  }

  async function handleDeleteDeal(deal) {
    if (!confirm(`Delete "${deal.title}"?`)) return
    await api.delete(`/deals/${deal.id}`)
    setEditingDeal(null)
    fetchProject()
  }

  if (loading) {
    return <p className="text-sm text-slate-400 py-8">Loading...</p>
  }

  if (notFound || !project) {
    return (
      <div className="text-center py-14 text-slate-400">
        <p className="font-display text-base font-semibold text-slate-500 mb-1.5">
          Project not found
        </p>
        It may have been deleted.{' '}
        <button
          onClick={() => navigate('/')}
          className="text-indigo-600 font-semibold hover:underline"
        >
          Go home
        </button>
      </div>
    )
  }

  const totalValue = project.deals.reduce((sum, d) => sum + Number(d.value || 0), 0)

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-[14px] p-5 mb-6 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight truncate">
                {project.name}
              </h2>
              {project.description && (
                <p className="text-sm text-slate-500 mt-1">{project.description}</p>
              )}
              <p className="font-mono text-[11px] text-slate-400 mt-2">
                {project.deals_count} deal{project.deals_count === 1 ? '' : 's'} ·{' '}
                {project.open_deals_count} open · {formatCurrencyCompact(totalValue)} total
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setAddingDeal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-[9px] hover:bg-indigo-700 transition"
            >
              <Plus size={15} strokeWidth={2.5} /> Add deal
            </button>
            <button
              onClick={() => setEditingProject(true)}
              className="w-9 h-9 rounded-[9px] border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <Pencil size={15} />
            </button>
          </div>
        </div>
      </div>

      {project.deals.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <p className="font-display text-base font-semibold text-slate-500 mb-1.5">
            No deals in this project yet
          </p>
          Add one to start tracking leads here.
        </div>
      ) : (
        <div className="space-y-4">
          {project.deals.map((deal) => {
            const style = STAGE_STYLE[deal.stage]
            return (
              <div
                key={deal.id}
                className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center shrink-0">
                      {initials(deal.contact?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{deal.title}</p>
                      <p className="text-[12px] text-slate-500 truncate">
                        {deal.contact?.name}
                        {deal.contact?.company ? ` · ${deal.contact.company.name}` : ''}
                        {deal.owner ? ` · ${deal.owner.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={{ backgroundColor: style.bg, color: style.fg }}
                    >
                      {deal.stage}
                    </span>
                    <span className="font-mono text-[12.5px] text-slate-700">
                      {formatCurrency(deal.value)}
                    </span>
                    <button
                      onClick={() => setEditingDeal(deal)}
                      className="w-8 h-8 rounded-[8px] border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                <ActivityTimeline contactId={deal.contact_id} dealId={deal.id} />
              </div>
            )
          })}
        </div>
      )}

      {editingProject && (
        <ProjectModal
          project={project}
          onClose={() => setEditingProject(false)}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}

      {addingDeal && (
        <DealModal
          deal={null}
          contacts={contacts}
          projects={projects}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setAddingDeal(false)}
          onSave={handleAddDeal}
        />
      )}

      {editingDeal && (
        <DealModal
          deal={editingDeal}
          contacts={contacts}
          projects={projects}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setEditingDeal(null)}
          onSave={handleEditDeal}
          onDelete={handleDeleteDeal}
        />
      )}
    </div>
  )
}
