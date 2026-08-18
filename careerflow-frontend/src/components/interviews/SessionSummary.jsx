import ScoreGauge from '../ScoreGauge.jsx'

const SUBSCORE_ROWS = [
  { label: 'Technical', key: 'technicalScore' },
  { label: 'Communication', key: 'communicationScore' },
  { label: 'Behavioral', key: 'behavioralScore' },
]

const areaChips = (label, items) => (
  <div className="session-summary__areas">
    <span className="session-summary__area-label">{label}</span>
    {items && items.length > 0 ? (
      <span className="session-summary__area-chips">
        {items.map((item) => (
          <span key={item} className="chip chip--default">
            {item}
          </span>
        ))}
      </span>
    ) : (
      <span className="session-summary__area-empty">None</span>
    )}
  </div>
)

export default function SessionSummary({ summary }) {
  if (!summary) return null

  return (
    <div className="session-summary">
      <div className="session-summary__score">
        <ScoreGauge score={summary.overallScore} size={128} caption="Overall" />
        <div className="session-summary__subscores">
          {SUBSCORE_ROWS.map(({ label, key }) => {
            const value = summary[key]
            return (
              <div key={key} className="subscore">
                <span className="subscore__label">{label}</span>
                <span className="subscore__value">{value == null ? '—' : value}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="session-summary__areas-wrap">
        {areaChips('Strong areas', summary.strongAreas)}
        {areaChips('Areas to improve', summary.weakAreas)}
      </div>
    </div>
  )
}