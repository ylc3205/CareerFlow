// Convert a backend date (ISO string or Date) to an <input type="date"> value (YYYY-MM-DD).
export const toDateInputValue = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format a backend date (ISO string or Date) for display, e.g. "Jan 5, 2026".
export const formatDisplayDate = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Parse a comma-separated string into a trimmed, non-empty array.
export const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

// Join an array into a comma-separated string for editing.
export const joinList = (list) => (Array.isArray(list) ? list.join(', ') : '')

// Drop undefined/null keys before sending to the backend ($set).
export const compact = (obj) => {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) out[key] = value
  }
  return out
}

let uid = 0

// Client-side id so list rows keep stable keys while editing (never sent to the API).
export const newItemId = () => `item-${Date.now()}-${uid++}`