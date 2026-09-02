export default function EmptyState({ icon, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-dashed border-border p-8 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-muted text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}