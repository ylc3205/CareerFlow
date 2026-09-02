import { APPLICATION_PROGRESS, APPLICATION_TERMINAL } from '../../utils/constants.js'

export default function ApplicationStatusTimeline({ status }) {
  const currentIndex = APPLICATION_PROGRESS.indexOf(status)
  const isTerminal = APPLICATION_TERMINAL.includes(status)

  return (
    <div className="space-y-3">
      <ol className="flex items-center flex-wrap gap-2">
        {APPLICATION_PROGRESS.map((step, index) => {
          const reached = isTerminal || index <= currentIndex
          const isCurrent = !isTerminal && index === currentIndex
          return (
            <li
              key={step}
              className={`flex items-center gap-1.5 text-sm font-medium ${
                isCurrent
                  ? 'text-primary'
                  : reached
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isCurrent
                    ? 'bg-primary'
                    : reached
                    ? 'bg-foreground'
                    : 'bg-border'
                }`}
                aria-hidden="true"
              />
              <span>{step}</span>
              {index < APPLICATION_PROGRESS.length - 1 && (
                <span
                  className={`h-0.5 w-8 ${
                    reached ? 'bg-foreground' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
      {isTerminal && (
        <p className="text-xs text-muted-foreground">
          Final status: <strong>{status}</strong>
        </p>
      )}
    </div>
  )
}