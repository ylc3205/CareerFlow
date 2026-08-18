import { APPLICATION_PROGRESS, APPLICATION_TERMINAL } from '../../utils/constants.js'

export default function ApplicationStatusTimeline({ status }) {
  const currentIndex = APPLICATION_PROGRESS.indexOf(status)
  const isTerminal = APPLICATION_TERMINAL.includes(status)

  return (
    <div className="timeline">
      <ol className="timeline__list">
        {APPLICATION_PROGRESS.map((step, index) => {
          const reached = isTerminal || index <= currentIndex
          const isCurrent = !isTerminal && index === currentIndex
          const classes = ['timeline__step', reached ? 'timeline__step--reached' : '', isCurrent ? 'timeline__step--current' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <li key={step} className={classes}>
              <span className="timeline__dot" aria-hidden="true" />
              <span className="timeline__label">{step}</span>
            </li>
          )
        })}
      </ol>
      {isTerminal && (
        <p className="timeline__terminal">
          Final status: <strong>{status}</strong>
        </p>
      )}
    </div>
  )
}