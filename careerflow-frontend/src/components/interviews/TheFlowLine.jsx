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
//   current    -> index === currentIndex (indigo fill + dot + soft ring)
//   upcoming   -> index > currentIndex   (empty outline marker)
//
// Layout: vertically stacked on mobile; a horizontal progression on sm and up.

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
    <ol
      className={cn('relative flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-0', className)}
      role="list"
      aria-label={ariaLabel}
    >
      {resolved.map((stage, index) => {
        const { status, label, meta } = stage
        const isLast = index === resolved.length - 1
        const isCurrent = status === 'current'
        const isCompleted = status === 'completed'

        return (
          <li
            key={stage.key}
            className="relative flex flex-1 items-start gap-3 pb-5 last:pb-0 sm:block sm:pb-0 sm:text-center"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-4 h-[calc(100%-1rem)] w-0 border-l-2 border-dashed border-border sm:hidden"
              />
            )}

            <div className="relative flex shrink-0 items-center justify-start sm:w-full sm:justify-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1/2 top-1/2 hidden h-0 w-1/2 -translate-y-1/2 border-t-2 border-dashed border-border sm:block"
                />
              )}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 hidden h-0 w-1/2 -translate-y-1/2 border-t-2 border-dashed border-border sm:block"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 sm:mt-0 sm:h-[18px] sm:w-[18px]',
                  isCompleted
                    ? 'border-success bg-success text-success-foreground'
                    : isCurrent
                      ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15'
                      : 'border-border bg-card'
                )}
              >
                {isCompleted && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                {isCurrent && <span className="h-1 w-1 rounded-full bg-primary-foreground" />}
              </span>
            </div>

            <div className="min-w-0 flex-1 sm:mt-2">
              <span
                className={cn(
                  'block text-sm leading-tight sm:text-center',
                  isCurrent
                    ? 'font-medium text-foreground'
                    : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
              {meta != null && (
                <span
                  className={cn(
                    'mt-0.5 block font-mono text-xs tabular-nums sm:mt-1 sm:text-center',
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