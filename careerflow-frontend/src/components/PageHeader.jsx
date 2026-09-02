export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </header>
  )
}