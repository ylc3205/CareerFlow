import ScoreBreakdown from './ScoreBreakdown.jsx'

const CATEGORY_LABELS = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  situational: 'Situational',
}

export default function CategoryPerformance({ performance }) {
  const byCategory = performance?.byCategory || {}
  const rows = Object.entries(byCategory)

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <ScoreBreakdown
          overall={performance?.averages?.overallScore ?? null}
          scores={[
            { label: 'Technical', value: performance?.averages?.technicalScore ?? null },
            { label: 'Communication', value: performance?.averages?.communicationScore ?? null },
            { label: 'Behavioral', value: performance?.averages?.behavioralScore ?? null },
          ]}
          emptyText="Answer some practice questions to see your average scores."
        />
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map(([key, entry]) => (
            <li key={key} className="flex items-center justify-between gap-4 p-3 rounded-sm border border-border bg-card">
              <span className="font-medium">{CATEGORY_LABELS[key] || key}</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                <span>{entry.count} question{entry.count === 1 ? '' : 's'}</span>
                <span className="font-mono tabular-nums font-medium">
                  {entry.averageScore == null ? 'No data' : `Avg ${entry.averageScore}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No evaluated questions yet.</p>
      )}

      {performance?.totalEvaluations != null && (
        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          {performance.totalEvaluations} evaluated answer{performance.totalEvaluations === 1 ? '' : 's'} overall
          {performance.averageAttemptsPerQuestion != null
            ? ` · ${performance.averageAttemptsPerQuestion} attempts per question`
            : ''}
        </p>
      )}
    </div>
  )
}