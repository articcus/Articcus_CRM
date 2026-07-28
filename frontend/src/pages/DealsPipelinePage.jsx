import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DealCard from '../components/DealCard'
import DealModal from '../components/DealModal'
import { formatCurrencyCompact } from '../lib/format'

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

function PipelineColumn({ stage, deals, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })

  const total = deals.reduce((sum, d) => sum + Number(d.value || 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-[14px] bg-slate-100 p-2.5 flex flex-col transition ${
        isOver ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      <div className="px-2 pb-2.5">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-[12.5px]">
            {stage.label}
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {deals.length} · {formatCurrencyCompact(total)}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[120px]">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={() => onCardClick(deal)} />
        ))}
      </div>
    </div>
  )
}

export default function DealsPipelinePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [deals, setDeals] = useState([])
  const [contacts, setContacts] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function fetchDeals() {
    setLoading(true)
    try {
      const { data } = await api.get('/deals')
      setDeals(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
    api.get('/contacts').then(({ data }) => setContacts(data.data))
    api.get('/projects').then(({ data }) => setProjects(data))
    if (isAdmin) {
      api.get('/users').then(({ data }) => setUsers(data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  function openAddModal() {
    setEditingDeal(null)
    setModalOpen(true)
  }

  function openEditModal(deal) {
    setEditingDeal(deal)
    setModalOpen(true)
  }

  async function handleSave(form) {
    const payload = {
      ...form,
      project_id: form.project_id || null,
      value: form.value || 0,
      expected_close_date: form.expected_close_date || null,
      owner_id: form.owner_id || null,
    }
    if (editingDeal) {
      await api.put(`/deals/${editingDeal.id}`, payload)
    } else {
      await api.post('/deals', payload)
    }
    setModalOpen(false)
    fetchDeals()
  }

  async function handleDelete(deal) {
    if (!confirm(`Delete "${deal.title}"?`)) return
    await api.delete(`/deals/${deal.id}`)
    setModalOpen(false)
    fetchDeals()
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return

    const dealId = active.id
    const newStage = over.id
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    )

    try {
      await api.patch(`/deals/${dealId}/stage`, { stage: newStage })
    } catch {
      fetchDeals()
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
          Pipeline
        </h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-[10px] hover:bg-indigo-700 transition"
        >
          <Plus size={16} strokeWidth={2.5} /> Add deal
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGES.map((stage) => (
              <PipelineColumn
                key={stage.value}
                stage={stage}
                deals={deals.filter((d) => d.stage === stage.value)}
                onCardClick={openEditModal}
              />
            ))}
          </div>
        </DndContext>
      )}

      {modalOpen && (
        <DealModal
          deal={editingDeal}
          contacts={contacts}
          projects={projects}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
