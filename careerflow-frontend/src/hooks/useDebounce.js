import { useEffect, useState } from 'react'

/**
 * Custom hook to debounce a value with support for immediate manual updates (e.g. on clear filters).
 *
 * @param {*} value The value to debounce
 * @param {number} [delay=350] Debounce delay in milliseconds
 * @returns {[*, Function]} [debouncedValue, setDebouncedValue]
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return [debouncedValue, setDebouncedValue]
}

export default useDebounce
