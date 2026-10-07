export default function StatTile({ label, icon: Icon, value, sub, subTone = 'muted', chart, onClick }) {
  const toneClass =
    subTone === 'good'
      ? 'text-emerald-600'
      : subTone === 'critical'
        ? 'text-rose-600'
        : 'text-slate-400'

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-[14px] p-4 shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)] transition ${
        onClick ? 'cursor-pointer hover:border-indigo-200 hover:shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(79,70,229,.12)]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] tracking-[.1em] uppercase text-slate-400">{label}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[26px] font-bold tracking-tight text-slate-900 truncate">
            {value}
          </p>
          {sub && <p className={`text-[11.5px] mt-1 ${toneClass}`}>{sub}</p>}
        </div>
        {chart && <div className="shrink-0">{chart}</div>}
      </div>
    </div>
  )
}
