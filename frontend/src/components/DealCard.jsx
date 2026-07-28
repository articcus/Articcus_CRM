import { useDraggable } from '@dnd-kit/core'
import { formatCurrency } from '../lib/format'

const STAGE_COLOR = {
  new: '#94a3b8',
  contacted: '#6366f1',
  qualified: '#0ea5a4',
  proposal: '#c7841a',
  won: '#1f9d6b',
  lost: '#96a0b3',
}

export default function DealCard({ deal, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white rounded-[10px] border border-slate-200 p-3 mb-2 cursor-grab active:cursor-grabbing shadow-[0_1px_2px_rgba(20,24,35,.04),0_8px_24px_rgba(20,24,35,.06)] hover:border-slate-300 transition ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <p className="text-[13px] font-semibold text-slate-900 truncate flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: STAGE_COLOR[deal.stage] }}
        />
        {deal.contact?.company?.name || deal.contact?.name}
      </p>
      <p className="text-xs text-slate-500 truncate mt-0.5">{deal.title}</p>
      <div className="flex items-center justify-between mt-2.5">
        <span className="font-mono text-[11.5px] text-slate-500">
          {formatCurrency(deal.value || 0)}
        </span>
        {deal.expected_close_date && (
          <span className="font-mono text-[10px] text-slate-400">
            {new Date(deal.expected_close_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  )
}
