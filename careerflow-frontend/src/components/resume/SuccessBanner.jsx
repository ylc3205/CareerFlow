import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

export default function SuccessBanner({ children, onDismiss, autoDismissTimeout = 5000 }) {
  useEffect(() => {
    if (!onDismiss || !autoDismissTimeout) return
    const timer = setTimeout(() => {
      onDismiss()
    }, autoDismissTimeout)
    return () => clearTimeout(timer)
  }, [onDismiss, autoDismissTimeout])

  if (!children) return null

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border border-success/30 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
      role="status"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-emerald-800/70 hover:bg-emerald-100 hover:text-emerald-900"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
