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
    <div className="category-performance">
      <div className="category-performance__averages">
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
        <ul className="category-performance__list">
          {rows.map(([key, entry]) => (
            <li key={key} className="category-performance__row">
              <span className="category-performance__label">{CATEGORY_LABELS[key] || key}</span>
              <span className="category-performance__count">
                {entry.count} question{entry.count === 1 ? '' : 's'}
              </span>
              <span className="category-performance__avg">
                {entry.averageScore == null ? 'No data' : `Avg ${entry.averageScore}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="job-detail__empty">No evaluated questions yet.</p>
      )}

      {performance?.totalEvaluations != null && (
        <p className="category-performance__footer">
          {performance.totalEvaluations} evaluated answer{performance.totalEvaluations === 1 ? '' : 's'} overall
          {performance.averageAttemptsPerQuestion != null
            ? ` · ${performance.averageAttemptsPerQuestion} attempts per question`
            : ''}
        </p>
      )}
    </div>
  )
}