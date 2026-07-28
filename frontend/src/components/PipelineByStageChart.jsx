import { formatCurrencyCompact } from '../lib/format'

const STAGE_META = {
  new: { label: 'New', color: '#c7d2fe' },
  contacted: { label: 'Contacted', color: '#a5b4fc' },
  qualified: { label: 'Qualified', color: '#818cf8' },
  proposal: { label: 'Proposal', color: '#4F46E5' },
  won: { label: 'Won', color: '#1F9D6B' },
  lost: { label: 'Lost', color: '#96A0B3' },
}

export default function PipelineByStageChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
      <h3 className="font-display font-bold text-sm tracking-tight mb-3">
        Pipeline by stage
      </h3>
      <table className="w-full text-sm">
        <tbody>
          {data.map((row) => {
            const meta = STAGE_META[row.stage]
            const pct = Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)
            return (
              <tr key={row.stage}>
                <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap w-24">
                  {meta.label}
                </td>
                <td className="py-1.5 w-full">
                  <div className="h-5 bg-slate-100 rounded-full">
                    <div
                      className="h-5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </td>
                <td className="py-1.5 pl-3 text-right font-mono text-[12px] text-slate-700 whitespace-nowrap">
                  {formatCurrencyCompact(row.value)}
                </td>
                <td className="py-1.5 pl-2 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap w-10">
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
