const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'LKR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const fullCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

export function formatCurrencyCompact(value) {
  return compactCurrency.format(value || 0)
}

export function formatCurrency(value) {
  return fullCurrency.format(value || 0)
}
