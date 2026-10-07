import { useEffect, useState } from 'react'
import { Check, ExternalLink, CalendarPlus } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import LogFollowUpModal from '../components/LogFollowUpModal'
import DealModal from '../components/DealModal'
import ContactModal from '../components/ContactModal'
import TaskDetailModal from '../components/TaskDetailModal'
import AddFollowUpModal from '../components/AddFollowUpModal'
import { formatCurrencyCompact } from '../lib/format'

const STAGE_COLOR = {
  new: '#94a3b8',
  contacted: '#6366f1',
  qualified: '#0ea5a4',
  proposal: '#c7841a',
  won: '#1f9d6b',
  lost: '#96a0b3',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function dayDiff(dateStr) {
  if (!dateStr) return null
  const a = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  const b = new Date(todayStr() + 'T00:00:00')
  return Math.round((a - b) / 86400000)
}

function bucketOf(dateStr) {
  const n = dayDiff(dateStr)
  if (n === null) return 'none'
  if (n < 0) return 'over'
  if (n === 0) return 'today'
  if (n <= 7) return 'soon'
  return 'later'
}

function relLabel(dateStr) {
  const n = dayDiff(dateStr)
  if (n === null) return 'No date'
  if (n < 0) return `${Math.abs(n)}d overdue`
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  return `in ${n}d`
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

const BUCKET_META = {
  over: { label: 'Overdue', pill: 'bg-rose-50 text-rose-600' },
  today: { label: 'Today', pill: 'bg-amber-50 text-amber-700' },
  soon: { label: 'This week', pill: 'bg-emerald-50 text-emerald-700' },
  later: { label: 'Later', pill: 'bg-slate-100 text-slate-500' },
  none: { label: 'No date set', pill: 'bg-slate-100 text-slate-500' },
}

export default function FollowUpsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [activities, setActivities] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loggingActivity, setLoggingActivity] = useState(null)
  const [openingDeal, setOpeningDeal] = useState(null)
  const [openingContact, setOpeningContact] = useState(null)
  const [viewingActivity, setViewingActivity] = useState(null)
  const [addingFollowUp, setAddingFollowUp] = useState(false)

  async function fetchAll() {
    setLoading(true)
    try {
      const [activitiesRes, dashboardRes] = await Promise.all([
        api.get('/activities', { params: { status: 'pending' } }),
        api.get('/dashboard'),
      ])
      setActivities(activitiesRes.data.data)
      setDashboard(dashboardRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    api.get('/contacts', { params: { per_page: 200 } }).then(({ data }) => setContacts(data.data))
    api.get('/companies', { params: { per_page: 200 } }).then(({ data }) => setCompanies(data.data))
    api.get('/projects').then(({ data }) => setProjects(data))
    if (isAdmin) {
      api.get('/users').then(({ data }) => setUsers(data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  function openItem(activity) {
    if (activity.deal) {
      setOpeningDeal(activity.deal)
    } else {
      setOpeningContact(activity.contact)
    }
  }

  async function handleDealSave(form) {
    const payload = {
      ...form,
      project_id: form.project_id || null,
      value: form.value || 0,
      expected_close_date: form.expected_close_date || null,
      owner_id: form.owner_id || null,
    }
    await api.put(`/deals/${openingDeal.id}`, payload)
    setOpeningDeal(null)
    fetchAll()
  }

  async function handleDealDelete(deal) {
    if (!confirm(`Delete "${deal.title}"?`)) return
    await api.delete(`/deals/${deal.id}`)
    setOpeningDeal(null)
    fetchAll()
  }

  async function handleContactSave(form) {
    const payload = {
      ...form,
      company_id: form.company_id || null,
      owner_id: form.owner_id || null,
    }
    await api.put(`/contacts/${openingContact.id}`, payload)
    setOpeningContact(null)
    fetchAll()
  }

  const groups = { over: [], today: [], soon: [], later: [], none: [] }
  activities.forEach((a) => groups[bucketOf(a.due_at)].push(a))
  Object.values(groups).forEach((g) =>
    g.sort((a, b) => (a.due_at || '9999').localeCompare(b.due_at || '9999'))
  )

  return (
    <div>
      {loading || !dashboard ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              Follow-ups
            </h2>
            <button
              onClick={() => setAddingFollowUp(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-[10px] hover:bg-indigo-700 transition"
            >
              <CalendarPlus size={16} strokeWidth={2.5} /> Add follow-up
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
            <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
              <div className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Overdue
              </div>
              <div className="font-display text-[28px] font-bold tracking-tight mt-2 text-rose-600">
                {groups.over.length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">need chasing now</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
              <div className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Due today
              </div>
              <div className="font-display text-[28px] font-bold tracking-tight mt-2 text-amber-600">
                {groups.today.length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">on the list for today</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
              <div className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> This week
              </div>
              <div className="font-display text-[28px] font-bold tracking-tight mt-2 text-emerald-600">
                {groups.soon.length}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">next 7 days</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
              <div className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Open pipeline
              </div>
              <div className="font-display text-[28px] font-bold tracking-tight mt-2">
                {formatCurrencyCompact(dashboard.open_pipeline_value)}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-1">
                {dashboard.open_pipeline_count} active deals
              </div>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <p className="font-display text-base font-semibold text-slate-500 mb-1.5">
                Nothing to chase
              </p>
              No open follow-ups. Log an activity from a contact or deal to get started.
            </div>
          ) : (
            ['over', 'today', 'soon', 'later', 'none'].map((key) => {
              const g = groups[key]
              if (!g.length) return null
              const meta = BUCKET_META[key]
              return (
                <div key={key} className="mb-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="font-display font-bold text-sm tracking-tight">
                      {meta.label}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold ${meta.pill}`}
                    >
                      {g.length}
                    </span>
                  </div>
                  {g.map((activity) => {
                    const stageColor = activity.deal
                      ? STAGE_COLOR[activity.deal.stage]
                      : '#cbd5e1'
                    const bucket = bucketOf(activity.due_at)
                    const dateColor =
                      bucket === 'over'
                        ? 'text-rose-600'
                        : bucket === 'today'
                          ? 'text-amber-600'
                          : 'text-slate-900'
                    const companyLabel =
                      activity.contact?.company?.name || activity.contact?.name || '—'

                    return (
                      <div
                        key={activity.id}
                        onClick={() => setViewingActivity(activity)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3.5 mb-2 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)] hover:border-slate-300 cursor-pointer transition"
                      >
                        <div
                          className="border-l-[3px] pl-3.5 min-w-0 flex-1"
                          style={{ borderColor: stageColor }}
                        >
                          <div className="font-semibold text-sm flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: stageColor }}
                            />
                            {companyLabel}
                          </div>
                          <div className="text-[12.5px] text-slate-500 mt-0.5 truncate">
                            {activity.subject}
                            {activity.deal && ` · ${formatCurrencyCompact(activity.deal.value)}`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono text-xs font-bold ${dateColor}`}>
                            {relLabel(activity.due_at)}
                          </div>
                          <div className="text-[10.5px] text-slate-400 mt-0.5">
                            {activity.deal ? `${activity.deal.stage} · ` : ''}
                            {fmtDate(activity.due_at)}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setLoggingActivity(activity)
                            }}
                            title="Log touch & reschedule"
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition"
                          >
                            <Check size={15} strokeWidth={2.4} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openItem(activity)
                            }}
                            title="Open deal/contact"
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <ExternalLink size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </>
      )}

      {viewingActivity && (
        <TaskDetailModal
          activity={viewingActivity}
          onClose={() => setViewingActivity(null)}
          onUpdated={fetchAll}
          onDeleted={fetchAll}
        />
      )}

      {loggingActivity && (
        <LogFollowUpModal
          activity={loggingActivity}
          onClose={() => setLoggingActivity(null)}
          onSaved={() => {
            setLoggingActivity(null)
            fetchAll()
          }}
        />
      )}

      {openingDeal && (
        <DealModal
          deal={openingDeal}
          contacts={contacts}
          projects={projects}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setOpeningDeal(null)}
          onSave={handleDealSave}
          onDelete={handleDealDelete}
          onContactCreated={(c) => setContacts((prev) => [c, ...prev])}
          onProjectCreated={(p) => setProjects((prev) => [p, ...prev])}
        />
      )}

      {openingContact && (
        <ContactModal
          contact={openingContact}
          companies={companies}
          users={users}
          isAdmin={isAdmin}
          onClose={() => setOpeningContact(null)}
          onSave={handleContactSave}
          onCompanyCreated={(c) => setCompanies((prev) => [c, ...prev])}
        />
      )}

      {addingFollowUp && (
        <AddFollowUpModal
          contacts={contacts}
          onClose={() => setAddingFollowUp(false)}
          onSaved={() => {
            setAddingFollowUp(false)
            fetchAll()
          }}
          onContactCreated={(c) => setContacts((prev) => [c, ...prev])}
        />
      )}
    </div>
  )
}
