const scoreColor = (score) => {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#d97706'
  return '#dc2626'
}

export default function ScoreGauge({ score, size = 120, caption }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div className="score-gauge" style={{ width: size, height: size }} role="img" aria-label={`Score ${clamped} out of 100`}>
      <svg viewBox="0 0 100 100" className="score-gauge__svg">
        <circle className="score-gauge__track" cx="50" cy="50" r={radius} />
        <circle
          className="score-gauge__value"
          cx="50"
          cy="50"
          r={radius}
          stroke={scoreColor(clamped)}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="score-gauge__label">
        <span className="score-gauge__number">{clamped}</span>
        {caption && <span className="score-gauge__caption">{caption}</span>}
      </div>
    </div>
  )
}
