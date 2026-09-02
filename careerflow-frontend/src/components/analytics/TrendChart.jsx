const WIDTH = 480
const HEIGHT = 140
const PAD = 8

const clampScore = (value) => Math.max(0, Math.min(100, Number(value) || 0))

export default function TrendChart({ trend = [] }) {
  if (trend.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
        <p className="mt-2 text-xs text-muted-foreground">Complete a practice session to see your score trend.</p>
      </div>
    )
  }

  const points = trend.map((item, index) => {
    const x = trend.length === 1 ? WIDTH / 2 : PAD + (index * (WIDTH - 2 * PAD)) / (trend.length - 1)
    const y = HEIGHT - PAD - (clampScore(item.overallScore) / 100) * (HEIGHT - 2 * PAD)
    return { x, y, item, index }
  })
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(' ')

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Overall score trend across completed practice sessions"
      >
        <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} className="stroke-border" strokeWidth="1" />
        {trend.length > 1 && <polyline points={polyline} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map(({ x, y, item, index }) => (
          <circle key={`${item.sessionId || index}-${index}`} cx={x} cy={y} r="4" className="fill-primary">
            <title>{`Session ${index + 1}: ${item.overallScore}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Earliest</span>
        <span>{trend.length} session{trend.length === 1 ? '' : 's'}</span>
        <span>Latest</span>
      </div>
    </div>
  )
}