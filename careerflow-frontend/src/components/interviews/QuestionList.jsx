import { Badge } from '../ui/badge.jsx'
import { PRACTICE_CATEGORY_LABEL, PRACTICE_CATEGORY_VARIANT } from '../../utils/constants.js'
import { PRACTICE_DIFFICULTY_LABEL, PRACTICE_DIFFICULTY_VARIANT } from '../../utils/constants.js'

export default function QuestionList({ questions }) {
  return (
    <ol
      className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card shadow-sm"
      aria-label="Interview preparation questions"
    >
      {questions.map((item, index) => (
        <li
          key={index}
          className="p-4 transition-colors hover:bg-secondary/30 sm:p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}.</span>
            <Badge variant={PRACTICE_CATEGORY_VARIANT[item.category] || 'default'}>
              {PRACTICE_CATEGORY_LABEL[item.category] || item.category}
            </Badge>
            <Badge variant={PRACTICE_DIFFICULTY_VARIANT[item.difficulty] || 'default'}>
              {PRACTICE_DIFFICULTY_LABEL[item.difficulty] || item.difficulty}
            </Badge>
          </div>
          <p className="mt-2.5 text-sm font-medium leading-relaxed text-foreground">{item.question}</p>
        </li>
      ))}
    </ol>
  )
}