import { useEffect, useState } from 'react'
import { Briefcase, Target, DollarSign, ListChecks, ChevronRight, MoreHorizontal } from 'lucide-react'
import api from '../api/client'
import StatTile from '../components/StatTile'
import PipelineByStageChart from '../components/PipelineByStageChart'
import RevenueByRepChart from '../components/RevenueByRepChart'
import MonthlyRevenueChart from '../components/MonthlyRevenueChart'
import SemiCircleGauge from '../components/SemiCircleGauge'
import DonutChart from '../components/DonutChart'
import { MiniBars, MiniSparkline } from '../components/MiniCharts'
import { formatCurrencyCompact } from '../lib/format'

const STAGE_STYLES = {
  new: 'bg-indigo-50 text-indigo-600',
  contacted: 'bg-indigo-50 text-indigo-600',
  qualified: 'bg-indigo-50 text-indigo-600',
  proposal: 'bg-indigo-50 text-indigo-600',
  won: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-slate-100 text-slate-500',
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

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [recentDeals, setRecentDeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/activities', { params: { status: 'pending' } }),
      api.get('/deals'),
    ]).then(([dashboardRes, activitiesRes, dealsRes]) => {
      setData(dashboardRes.data)

      const sorted = [...activitiesRes.data.data].sort((a, b) => {
        if (!a.due_at) return 1
        if (!b.due_at) return -1
        return new Date(a.due_at) - new Date(b.due_at)
      })
      setUpcoming(sorted.slice(0, 3))
      setRecentDeals(dealsRes.data.data.slice(0, 5))
      setLoading(false)
    })
  }, [])

  if (loading || !data) {
    return <p className="text-sm text-slate-400 py-8">Loading...</p>
  }

  const winRate = data.win_rate === null ? 0 : Math.round(data.win_rate * 100)
  const openStageBars = data.pipeline_by_stage
    .filter((s) => ['new', 'contacted', 'qualified', 'proposal'].includes(s.stage))
    .map((s) => s.count)
  const monthlyBars = data.monthly_revenue.map((m) => m.value)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Open pipeline"
          icon={Briefcase}
          value={formatCurrencyCompact(data.open_pipeline_value)}
          sub={`${data.open_pipeline_count} open deals`}
          subTone="good"
          chart={<MiniBars values={openStageBars.length ? openStageBars : [1]} />}
        />
        <StatTile
          label="Win rate"
          icon={Target}
          value={data.win_rate === null ? '—' : `${winRate}%`}
          sub={`${data.won_count} won / ${data.lost_count} lost`}
          subTone={data.win_rate === null ? 'muted' : winRate >= 50 ? 'good' : 'critical'}
          chart={<MiniBars values={[data.won_count || 0, data.lost_count || 0]} highlightLast={1} />}
        />
        <StatTile
          label="Won this month"
          icon={DollarSign}
          value={formatCurrencyCompact(data.won_this_month_value)}
          sub={`${data.won_this_month_count} deals closed`}
          subTone="good"
          chart={<MiniSparkline values={monthlyBars.length ? monthlyBars : [0, 0]} />}
        />
        <StatTile
          label="Tasks due"
          icon={ListChecks}
          value={data.upcoming_tasks_count}
          sub={
            data.overdue_tasks_count > 0
              ? `${data.overdue_tasks_count} overdue`
              : 'none overdue'
          }
          subTone={data.overdue_tasks_count > 0 ? 'critical' : 'muted'}
          chart={
            <MiniBars
              values={[data.upcoming_tasks_count || 0, data.overdue_tasks_count || 0]}
              highlightLast={1}
            />
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MonthlyRevenueChart data={data.monthly_revenue} />

        <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)] flex flex-col">
          <h3 className="font-display font-bold text-sm tracking-tight mb-1">Win rate</h3>
          <div className="flex-1 flex items-center">
            <SemiCircleGauge
              percent={winRate}
              centerValue={data.won_count + data.lost_count}
              centerLabel={data.win_rate === null ? 'no closed deals' : `${winRate}%`}
            />
          </div>
          <div className="flex items-center justify-center gap-4 text-xs mt-1">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Won -{' '}
              {data.won_count}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-100" /> Lost -{' '}
              {data.lost_count}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm tracking-tight">Upcoming tasks</h3>
            <MoreHorizontal size={16} className="text-slate-300" />
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing due soon.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((activity) => {
                const due = activity.due_at ? new Date(activity.due_at) : null
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 rounded-xl hover:bg-slate-50 p-2 -mx-2 transition"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center leading-none shrink-0">
                      <span className="text-[10px] font-medium uppercase">
                        {due ? due.toLocaleDateString(undefined, { month: 'short' }) : '—'}
                      </span>
                      <span className="text-sm font-bold">
                        {due ? due.getDate() : '·'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.subject}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {activity.contact?.name}
                        {due &&
                          ` · ${due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
          <h3 className="font-display font-bold text-sm tracking-tight mb-3">Recent deals</h3>
          {recentDeals.length === 0 ? (
            <p className="text-sm text-slate-400">No deals yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 font-bold pb-2">Contact</th>
                  <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 font-bold pb-2">Deal</th>
                  <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 font-bold pb-2">Value</th>
                  <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 font-bold pb-2">Stage</th>
                  <th className="font-mono text-[10px] tracking-[.08em] uppercase text-slate-400 font-bold pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center shrink-0">
                          {initials(deal.contact?.name)}
                        </div>
                        <span className="text-slate-700 whitespace-nowrap">
                          {deal.contact?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-600 max-w-[160px] truncate">
                      {deal.title}
                    </td>
                    <td className="py-2.5 text-slate-700 tabular-nums whitespace-nowrap">
                      {formatCurrencyCompact(deal.value)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STAGE_STYLES[deal.stage]}`}
                      >
                        {deal.stage}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <MoreHorizontal size={16} className="text-slate-300 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
          <h3 className="font-display font-bold text-sm tracking-tight mb-3">Won vs lost</h3>
          <DonutChart
            segments={[
              { label: 'Won', value: data.won_count, color: '#1F9D6B' },
              { label: 'Lost', value: data.lost_count, color: '#EEF0F6' },
            ]}
          />
          {data.won_count + data.lost_count === 0 ? (
            <p className="text-sm text-slate-400 text-center mt-2">No closed deals yet.</p>
          ) : (
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div className="text-center">
                <p className="font-semibold text-slate-900">Won</p>
                <p className="text-xs text-slate-400">
                  {winRate}% · {data.won_count}
                </p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">Lost</p>
                <p className="text-xs text-slate-400">
                  {100 - winRate}% · {data.lost_count}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineByStageChart data={data.pipeline_by_stage} />
        <RevenueByRepChart data={data.revenue_by_rep} />
      </div>
    </div>
  )
}
