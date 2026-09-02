import ScoreGauge from '../ScoreGauge.jsx'

const SUBSCORE_ROWS = [
  { label: 'Technical', key: 'technicalScore' },
  { label: 'Communication', key: 'communicationScore' },
  { label: 'Behavioral', key: 'behavioralScore' },
]

const renderList = (items, emptyText) => {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="text-sm">{item}</li>
      ))}
    </ul>
  )
}

export default function AnswerEvaluation({ evaluation }) {
  if (!evaluation) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 flex-wrap">
        <ScoreGauge score={evaluation.score} size={96} caption="Score" />
        <div className="flex flex-wrap gap-4">
          {SUBSCORE_ROWS.map(({ label, key }) => {
            const value = evaluation[key]
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
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Strengths</h3>
          {renderList(evaluation.strengths, 'None highlighted.')}
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Areas to improve</h3>
          {renderList(evaluation.weaknesses, 'None highlighted.')}
        </div>
      </div>

      {evaluation.feedback && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Feedback</h3>
          <p className="text-sm whitespace-pre-wrap">{evaluation.feedback}</p>
        </div>
      )}

      {evaluation.suggestedAnswer && (
        <div className="space-y-2 border-t border-border pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested answer</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{evaluation.suggestedAnswer}</p>
        </div>
      )}
    </div>
  )
}