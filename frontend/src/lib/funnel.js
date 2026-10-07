// Ordinal indigo ramp (funnel order), validated with scripts/validate_palette.js --ordinal.
// Won/Lost break from the ramp for the same reason pipeline-by-stage does: they're semantic
// outcomes (good/neutral), not another step of "how qualified is this lead".
export const FUNNEL_STAGE_META = {
  mql: { label: 'MQL', sub: 'Marketing qualified', color: '#818cf8' },
  sql: { label: 'SQL', sub: 'Sales qualified', color: '#6366f1' },
  opportunity: { label: 'Opportunity', sub: 'Working the deal', color: '#4f46e5' },
  qualified: { label: 'Qualified', sub: 'Deal qualified', color: '#3730a3' },
  proposal: { label: 'Proposal', sub: 'Proposal sent', color: '#1e1b4b' },
  won: { label: 'Won', sub: 'Closed won', color: '#1F9D6B' },
}

export const LOST_META = { label: 'Lost', color: '#96A0B3' }
