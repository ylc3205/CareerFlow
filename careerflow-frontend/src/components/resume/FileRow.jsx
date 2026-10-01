import { FileText } from 'lucide-react'

export default function FileRow({ title, name, size }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        {title && <p className="text-xs text-muted-foreground">{title}</p>}
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      {size && <p className="ml-auto shrink-0 text-xs text-muted-foreground">{size}</p>}
    </div>
  )
}
