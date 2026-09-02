import ScoreGauge from '../ScoreGauge.jsx'

export default function ScoreBreakdown({ overall, scores = [], emptyText = 'No scores yet' }) {
  if (overall == null) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 flex-wrap">
        <ScoreGauge score={overall} size={120} caption="Overall" />
        <div className="flex-1 min-w-[200px] space-y-3">
          {scores.map(({ label, value }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono tabular-nums font-medium">{value == null ? '—' : value}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${value == null ? 0 : Math.max(0, Math.min(100, value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}