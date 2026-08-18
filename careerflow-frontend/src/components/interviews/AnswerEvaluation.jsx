import ScoreGauge from '../ScoreGauge.jsx'

const SUBSCORE_ROWS = [
  { label: 'Technical', key: 'technicalScore' },
  { label: 'Communication', key: 'communicationScore' },
  { label: 'Behavioral', key: 'behavioralScore' },
]

const renderList = (items, emptyText) => {
  if (!items || items.length === 0) return <p className="evaluation__empty">{emptyText}</p>
  return (
    <ul className="evaluation__list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

export default function AnswerEvaluation({ evaluation }) {
  if (!evaluation) return null

  return (
    <div className="evaluation">
      <div className="evaluation__summary">
        <ScoreGauge score={evaluation.score} size={96} caption="Score" />
        <div className="evaluation__subscores">
          {SUBSCORE_ROWS.map(({ label, key }) => {
            const value = evaluation[key]
            return (
              <div key={key} className="subscore">
                <span className="subscore__label">{label}</span>
                <span className="subscore__value">{value == null ? '—' : value}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="evaluation__columns">
        <div className="evaluation__column">
          <h3 className="evaluation__heading">Strengths</h3>
          {renderList(evaluation.strengths, 'None highlighted.')}
        </div>
        <div className="evaluation__column">
          <h3 className="evaluation__heading">Areas to improve</h3>
          {renderList(evaluation.weaknesses, 'None highlighted.')}
        </div>
      </div>

      {evaluation.feedback && (
        <div className="evaluation__block">
          <h3 className="evaluation__heading">Feedback</h3>
          <p className="evaluation__text">{evaluation.feedback}</p>
        </div>
      )}

      {evaluation.suggestedAnswer && (
        <div className="evaluation__block">
          <h3 className="evaluation__heading">Suggested answer</h3>
          <p className="evaluation__text evaluation__text--suggested">{evaluation.suggestedAnswer}</p>
        </div>
      )}
    </div>
  )
}