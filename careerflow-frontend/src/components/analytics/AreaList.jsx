import { Badge } from '../ui/badge.jsx'

const TONE_VARIANT = {
  strong: 'success',
  weak: 'destructive',
  neutral: 'outline',
}

export default function AreaList({ title, areas = [], tone = 'neutral', emptyText = 'Nothing yet' }) {
  const variant = TONE_VARIANT[tone] || TONE_VARIANT.neutral

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      {areas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {areas.map(({ area, count }) => (
            <Badge key={area} variant={variant}>
              {area} <span className="font-mono tabular-nums">×{count}</span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  )
}