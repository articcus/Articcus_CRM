import { useEffect, useState } from 'react'
import { Users, Target, Wallet, XCircle, ChevronDown } from 'lucide-react'
import api from '../api/client'
import StatTile from '../components/StatTile'
import { FUNNEL_STAGE_META, LOST_META } from '../lib/funnel'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'

export default function SalesFunnelPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/funnel').then(({ data }) => {
      setData(data)
      setLoading(false)
    })
  }, [])

  if (loading || !data) {
    return <p className="text-sm text-slate-400 py-8">Loading...</p>
  }

  const { stages, total_contacts, lost_count, lost_value } = data
  const maxCount = Math.max(stages[0]?.count || 0, 1)
  const wonCount = stages.find((s) => s.stage === 'won')?.count || 0
  const overallConversion =
    total_contacts > 0 ? Math.round((wonCount / total_contacts) * 1000) / 10 : 0
  const openFunnelValue = stages
    .filter((s) => s.stage === 'qualified' || s.stage === 'proposal')
    .reduce((sum, s) => sum + (s.value || 0), 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
          Sales funnel
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Every lead's journey from first contact to closed revenue, at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total leads" icon={Users} value={total_contacts} sub="in the funnel" />
        <StatTile
          label="Lead-to-won"
          icon={Target}
          value={`${overallConversion}%`}
          sub={`${wonCount} won of ${total_contacts}`}
          subTone={wonCount > 0 ? 'good' : 'muted'}
        />
        <StatTile
          label="Open funnel value"
          icon={Wallet}
          value={formatCurrencyCompact(openFunnelValue)}
          sub="qualified + proposal"
        />
        <StatTile
          label="Lost"
          icon={XCircle}
          value={lost_count}
          sub={formatCurrencyCompact(lost_value)}
          subTone={lost_count > 0 ? 'critical' : 'muted'}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-[14px] p-6 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
        <div className="max-w-3xl mx-auto space-y-1">
          {stages.map((row, i) => {
            const meta = FUNNEL_STAGE_META[row.stage]
            const pct = Math.max(Math.round((row.count / maxCount) * 100), row.count > 0 ? 8 : 3)
            const next = stages[i + 1]

            return (
              <div key={row.stage}>
                <div className="grid grid-cols-[144px_1fr_128px] items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                    <p className="text-[11px] text-slate-400">{meta.sub}</p>
                  </div>
                  <div className="h-11 bg-slate-100 rounded-2xl overflow-hidden">
                    <div
                      className="h-full rounded-2xl transition-all"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                  <div>
                    <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {row.count}
                    </p>
                    {row.value !== null && (
                      <p className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {formatCurrencyCompact(row.value)}
                      </p>
                    )}
                  </div>
                </div>

                {next && (
                  <div className="grid grid-cols-[144px_1fr_128px] gap-4">
                    <div />
                    <div className="flex justify-center py-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                        <ChevronDown size={11} />
                        {row.conversion_to_next !== null
                          ? `${row.conversion_to_next}% to ${FUNNEL_STAGE_META[next.stage].label}`
                          : 'no data yet'}
                      </span>
                    </div>
                    <div />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="max-w-3xl mx-auto mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: LOST_META.color }}
            />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{lost_count}</span> lost along the
              way
            </span>
          </div>
          <span className="font-mono text-sm text-slate-500 tabular-nums">
            {formatCurrency(lost_value)}
          </span>
        </div>
      </div>
    </div>
  )
}
