export const LEAD_STATUSES = ['mql', 'sql', 'opportunity']

export const LEAD_STATUS_LABELS = {
  mql: 'MQL',
  sql: 'SQL',
  opportunity: 'Opportunity',
}

// Ordinal indigo ramp (funnel order) — validated with scripts/validate_palette.js --ordinal
export const LEAD_STATUS_CHART_COLORS = {
  mql: '#818cf8',
  sql: '#6366f1',
  opportunity: '#4338ca',
}

export const LEAD_STATUS_BADGE_CLASSES = {
  mql: 'bg-indigo-50 text-indigo-500',
  sql: 'bg-indigo-100 text-indigo-600',
  opportunity: 'bg-indigo-200 text-indigo-800',
}
