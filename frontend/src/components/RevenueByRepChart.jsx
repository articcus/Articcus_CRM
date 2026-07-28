import { formatCurrencyCompact } from '../lib/format'

const SEQUENTIAL_INDIGO = '#4F46E5'

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function RevenueByRepChart({ data }) {
  const max = Math.max(...data.map((d) => d.won_value), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)]">
      <h3 className="font-display font-bold text-sm tracking-tight mb-3">
        Revenue by rep
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No won deals yet.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {data.map((row) => {
              const pct = Math.max((row.won_value / max) * 100, 2)
              return (
                <tr key={row.owner_id}>
                  <td className="py-1.5 pr-2 w-8">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-semibold flex items-center justify-center">
                      {initials(row.owner_name)}
                    </div>
                  </td>
                  <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap w-28 truncate">
                    {row.owner_name}
                  </td>
                  <td className="py-1.5 w-full">
                    <div className="h-5 bg-slate-100 rounded-full">
                      <div
                        className="h-5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: SEQUENTIAL_INDIGO }}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 pl-3 text-right font-mono text-[12px] text-slate-700 whitespace-nowrap">
                    {formatCurrencyCompact(row.won_value)}
                  </td>
                  <td className="py-1.5 pl-2 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap w-10">
                    {row.won_count}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
