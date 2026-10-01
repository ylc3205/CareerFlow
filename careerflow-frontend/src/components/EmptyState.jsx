import { cn } from '../utils/index.js'

export default function EmptyState({ icon, title = 'Nothing here yet', description, action, embedded = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        embedded
          ? 'py-8 bg-transparent'
          : 'rounded-xl border border-dashed border-border bg-card/50 p-8',
        className
      )}
    >
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}