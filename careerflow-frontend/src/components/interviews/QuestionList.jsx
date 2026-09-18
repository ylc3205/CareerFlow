import { Badge } from '../ui/badge.jsx'
import { PRACTICE_CATEGORY_LABEL, PRACTICE_CATEGORY_VARIANT } from '../../utils/constants.js'
import { PRACTICE_DIFFICULTY_LABEL, PRACTICE_DIFFICULTY_VARIANT } from '../../utils/constants.js'

export default function QuestionList({ questions }) {
  return (
    <ol className="space-y-4" aria-label="Interview preparation questions">
      {questions.map((item, index) => (
        <li
          key={index}
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-muted-foreground">{index + 1}.</span>
            <Badge variant={PRACTICE_CATEGORY_VARIANT[item.category] || 'default'}>
              {PRACTICE_CATEGORY_LABEL[item.category] || item.category}
            </Badge>
            <Badge variant={PRACTICE_DIFFICULTY_VARIANT[item.difficulty] || 'default'}>
              {PRACTICE_DIFFICULTY_LABEL[item.difficulty] || item.difficulty}
            </Badge>
          </div>
          <p className="mt-3 text-base font-medium leading-relaxed text-foreground">{item.question}</p>
        </li>
      ))}
    </ol>
  )
}