import ScoreGauge from '../ScoreGauge.jsx'
import { Badge } from '../ui/badge.jsx'

const SUBSCORE_ROWS = [
  { label: 'Technical', key: 'technicalScore' },
  { label: 'Communication', key: 'communicationScore' },
  { label: 'Behavioral', key: 'behavioralScore' },
]

const areaChips = (label, items) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    {items && items.length > 0 ? (
      <span className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline">{item}</Badge>
        ))}
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">None</span>
    )}
  </div>
)

export default function SessionSummary({ summary }) {
  if (!summary) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 flex-wrap">
        <ScoreGauge score={summary.overallScore} size={128} caption="Overall" />
        <div className="flex flex-wrap gap-4">
          {SUBSCORE_ROWS.map(({ label, key }) => {
            const value = summary[key]
            return (
              <div key={key} className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="font-mono tabular-nums text-lg">{value == null ? '—' : value}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {areaChips('Strong areas', summary.strongAreas)}
        {areaChips('Areas to improve', summary.weakAreas)}
      </div>
    </div>
  )
}