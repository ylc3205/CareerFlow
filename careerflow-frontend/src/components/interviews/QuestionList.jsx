import { Badge } from '../ui/badge.jsx'

const CATEGORY_LABELS = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  situational: 'Situational',
}

const CATEGORY_VARIANTS = {
  technical: 'primary',
  behavioral: 'warning',
  situational: 'default',
}

const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const DIFFICULTY_VARIANTS = {
  easy: 'success',
  medium: 'warning',
  hard: 'destructive',
}

export default function QuestionList({ questions }) {
  return (
    <ol className="space-y-4">
      {questions.map((item, index) => (
        <li key={index} className="rounded-sm border border-border bg-card p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono tabular-nums text-sm text-muted-foreground">{index + 1}.</span>
            <Badge variant={CATEGORY_VARIANTS[item.category] || 'default'}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Badge>
            <Badge variant={DIFFICULTY_VARIANTS[item.difficulty] || 'default'}>
              {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
            </Badge>
          </div>
          <p className="mt-3 text-base">{item.question}</p>
        </li>
      ))}
    </ol>
  )
}