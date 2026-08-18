import Badge from '../Badge.jsx'

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
  hard: 'danger',
}

export default function QuestionList({ questions }) {
  return (
    <ol className="question-list">
      {questions.map((item, index) => (
        <li key={index} className="question-list__item">
          <div className="question-list__meta">
            <span className="question-list__number">{index + 1}.</span>
            <Badge variant={CATEGORY_VARIANTS[item.category] || 'default'}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Badge>
            <Badge variant={DIFFICULTY_VARIANTS[item.difficulty] || 'default'}>
              {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
            </Badge>
          </div>
          <p className="question-list__text">{item.question}</p>
        </li>
      ))}
    </ol>
  )
}