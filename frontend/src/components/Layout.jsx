import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CheckCircle2,
  KanbanSquare,
  Rows3,
  Building2,
  Users,
  LayoutDashboard,
  LogOut,
  Plus,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import ProjectModal from './ProjectModal'

const NAV = [
  { to: '/', label: 'Follow-ups', icon: CheckCircle2, end: true },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { to: '/deals', label: 'All deals', icon: Rows3 },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const [overdueCount, setOverdueCount] = useState(0)
  const [projects, setProjects] = useState([])
  const [addingProject, setAddingProject] = useState(false)

  function fetchProjects() {
    api.get('/projects').then(({ data }) => setProjects(data))
  }

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setOverdueCount(data.overdue_tasks_count || 0))
    fetchProjects()
  }, [])

  async function handleCreateProject(form) {
    await api.post('/projects', form)
    setAddingProject(false)
    fetchProjects()
  }

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 text-[14px]">
      <aside className="w-[248px] shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <img src="/logo-articcus.png" alt="Articcus" className="h-6 w-auto" />
          <p className="font-mono text-[9px] tracking-[.18em] text-slate-400 uppercase mt-1.5">
            Follow-up desk
          </p>
        </div>

        <nav className="px-3 pt-3.5 pb-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 w-full px-3 py-2 rounded-[9px] text-[13.5px] font-medium mb-0.5 transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <item.icon size={16} strokeWidth={2} className="shrink-0" />
              {item.label}
              {item.to === '/' && overdueCount > 0 && (
                <span className="ml-auto font-mono text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-px font-bold">
                  {overdueCount}
                </span>
              )}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/team"
              className={({ isActive }) =>
                `flex items-center gap-2.5 w-full px-3 py-2 rounded-[9px] text-[13.5px] font-medium mb-0.5 transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <UsersRound size={16} strokeWidth={2} className="shrink-0" />
              Team
            </NavLink>
          )}
        </nav>

        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <p className="font-mono text-[9.5px] tracking-[.18em] uppercase text-slate-400">
            Projects
          </p>
          <button
            onClick={() => setAddingProject(true)}
            title="New project"
            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>
        <div className="px-3 pb-3">
          {projects.length === 0 && (
            <p className="px-3 py-1.5 text-[12px] text-slate-400">No projects yet.</p>
          )}
          {projects.map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 w-full px-3 py-2 rounded-[9px] text-[13px] mb-0.5 transition ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate">{project.name}</span>
              <span className="ml-auto font-mono text-[10.5px] text-slate-400">
                {project.open_deals_count}
              </span>
            </NavLink>
          ))}
        </div>

        <div className="mt-auto px-4 py-3.5 border-t border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0">
            {initials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-slate-900 truncate">{user?.name}</p>
            {user?.role === 'admin' && (
              <p className="text-[11px] text-indigo-600">Admin</p>
            )}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-slate-400 hover:text-rose-500 transition p-1 shrink-0"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="px-7 py-6 max-w-[1400px]">{children}</div>
      </main>

      {addingProject && (
        <ProjectModal
          project={null}
          onClose={() => setAddingProject(false)}
          onSave={handleCreateProject}
        />
      )}
    </div>
  )
}
