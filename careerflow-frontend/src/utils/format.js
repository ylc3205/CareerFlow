// Convert a backend date (ISO string or Date) to an <input type="date"> value (YYYY-MM-DD).
export const toDateInputValue = (value) => {
  if (!value) return ''
  // Date-only values (e.g. a backend ISO string of a UTC-midnight date) must
  // round-trip to the exact YYYY-MM-DD the user entered, regardless of the
  // browser timezone. Read the leading date components directly instead of
  // converting to a local-time Date, which could shift the day.
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }
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
  // A UTC-midnight instant represents a date-only value (e.g. appliedAt,
  // scheduledDate) entered as YYYY-MM-DD. Format it in UTC so the displayed
  // date does not drift into the previous day in negative-offset timezones.
  // Real timestamps (createdAt, completedAt, ...) keep local display.
  const isUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(isUtcMidnight ? { timeZone: 'UTC' } : {}),
  })
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