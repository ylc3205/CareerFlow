import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce.js'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    const [debouncedValue] = result.current
    expect(debouncedValue).toBe('hello')
  })

  it('updates debounced value after specified delay', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
      initialProps: { val: 'first' },
    })

    rerender({ val: 'second' })
    expect(result.current[0]).toBe('first')

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current[0]).toBe('first')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current[0]).toBe('second')
  })

  it('allows manual immediate update via setter', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    const [, setDebouncedValue] = result.current

    act(() => {
      setDebouncedValue('immediate')
    })
    expect(result.current[0]).toBe('immediate')
  })
})
