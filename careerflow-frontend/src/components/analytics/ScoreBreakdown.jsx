import ScoreGauge from '../ScoreGauge.jsx'

export default function ScoreBreakdown({ overall, scores = [], emptyText = 'No scores yet' }) {
  if (overall == null) {
    return <p className="score-breakdown__empty">{emptyText}</p>
  }

  return (
    <div className="score-breakdown">
      <div className="score-breakdown__gauge">
        <ScoreGauge score={overall} size={120} caption="Overall" />
      </div>
      <div className="score-breakdown__rows">
        {scores.map(({ label, value }) => (
          <div key={label} className="subscore">
            <div className="subscore__label">{label}</div>
            <div className="subscore__bar">
              <span
                className="subscore__fill"
                style={{ width: `${value == null ? 0 : Math.max(0, Math.min(100, value))}%` }}
              />
            </div>
            <div className="subscore__value">{value == null ? '—' : value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}