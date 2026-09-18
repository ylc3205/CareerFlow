import { CheckCircle2, Target, BookOpen, MessageSquareText } from 'lucide-react'
import ScoreGauge from '../ScoreGauge.jsx'

const SUBSCORE_ROWS = [
  { label: 'Technical', key: 'technicalScore' },
  { label: 'Communication', key: 'communicationScore' },
  { label: 'Behavioral', key: 'behavioralScore' },
]

// List content is AI-generated text — presentation only, never rewritten.
const renderList = (items, emptyText) => {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-relaxed">
          <span className="mt-1.5 shrink-0" aria-hidden="true">
            <span className="block h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AnswerEvaluation({ evaluation }) {
  if (!evaluation) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-7 flex-wrap">
        <ScoreGauge score={evaluation.score} size={112} caption="Score" />
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {SUBSCORE_ROWS.map(({ label, key }) => {
            const value = evaluation[key]
            return (
              <div key={key} className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="block font-mono tabular-nums text-xl leading-none">{value == null ? '—' : value}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Strengths
          </h3>
          <div className="mt-3 space-y-3 text-emerald-950">
            {renderList(evaluation.strengths, 'None highlighted.')}
          </div>
        </section>

        <section className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Target className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Areas to improve
          </h3>
          <div className="mt-3 space-y-3 text-amber-950">
            {renderList(evaluation.weaknesses, 'None highlighted.')}
          </div>
        </section>
      </div>

      {evaluation.feedback && (
        <section className="space-y-2 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Feedback
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{evaluation.feedback}</p>
        </section>
      )}

      {evaluation.suggestedAnswer && (
        <section className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <BookOpen className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            Suggested answer
          </h3>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{evaluation.suggestedAnswer}</p>
        </section>
      )}
    </div>
  )
}