import { Check } from 'lucide-react'
import { cn } from '@/utils/index.js'

// The Flow Line — the signature "current career position" marker.
//
// Props:
//   stages        [{ key, label, meta?, status? }] — ordered pipeline stages.
//                 `status` overrides the derived state when provided.
//   currentKey    string | null — key of the furthest stage reached. When null
//                 (or matching no stage), every stage renders as "upcoming".
//   ariaLabel     Accessible name for the list (defaults to "Career pipeline").
//   className     Extra classes for the <ol>.
//
// Derived states per stage:
//   completed  -> index < currentIndex   (emerald fill + check)
//   current    -> index === currentIndex (near-black fill + dot — high contrast)
//   upcoming   -> index > currentIndex   (empty outline marker)

export default function TheFlowLine({
  stages = [],
  currentKey = null,
  ariaLabel = 'Career pipeline',
  className,
}) {
  const currentIndex =
    currentKey == null ? -1 : stages.findIndex((stage) => stage.key === currentKey)

  const resolved = stages.map((stage, index) => ({
    ...stage,
    status:
      stage.status ??
      (index < currentIndex
        ? 'completed'
        : index === currentIndex
          ? 'current'
          : 'upcoming'),
  }))

  return (
    <ol className={cn('relative', className)} role="list" aria-label={ariaLabel}>
      {resolved.map((stage, index) => {
        const { status, label, meta } = stage
        const isLast = index === resolved.length - 1
        const isCurrent = status === 'current'
        const isCompleted = status === 'completed'

        return (
          <li key={stage.key} className="relative flex items-start gap-4 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-4 h-full w-0 border-l-2 border-dashed border-border"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                isCompleted
                  ? 'border-success bg-success text-success-foreground'
                  : isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card'
              )}
            >
              {isCompleted && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              {isCurrent && <span className="h-1 w-1 rounded-full bg-primary-foreground" />}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <span
                className={cn(
                  'text-sm leading-tight',
                  isCurrent ? 'font-medium text-foreground' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
              {meta != null && (
                <span
                  className={cn(
                    'shrink-0 font-mono text-sm tabular-nums',
                    isCurrent ? 'font-medium text-foreground' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {meta}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}