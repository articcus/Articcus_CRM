import { LEAD_STATUS_LABELS, LEAD_STATUS_CHART_COLORS } from '../lib/leadStatus'

export default function LeadFunnelChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
      <h3 className="font-display font-bold text-sm tracking-tight mb-3">
        Lead funnel
      </h3>
      <table className="w-full text-sm">
        <tbody>
          {data.map((row) => {
            const color = LEAD_STATUS_CHART_COLORS[row.status]
            const pct = Math.max((row.count / max) * 100, row.count > 0 ? 2 : 0)
            return (
              <tr key={row.status}>
                <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap w-24">
                  {LEAD_STATUS_LABELS[row.status]}
                </td>
                <td className="py-1.5 w-full">
                  <div className="h-5 bg-slate-100 rounded-full">
                    <div
                      className="h-5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </td>
                <td className="py-1.5 pl-3 text-right font-mono text-[12px] text-slate-700 whitespace-nowrap w-10">
                  {row.count}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
