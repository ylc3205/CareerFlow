import { Check } from 'lucide-react'
import { APPLICATION_PROGRESS, APPLICATION_TERMINAL } from '../../utils/constants.js'

const stepLabel = (step) => step.charAt(0).toUpperCase() + step.slice(1)

export default function ApplicationStatusTimeline({ status }) {
  const currentIndex = APPLICATION_PROGRESS.indexOf(status)
  const isTerminal = APPLICATION_TERMINAL.includes(status)
  const lastReachedIndex = isTerminal ? APPLICATION_PROGRESS.length - 1 : currentIndex

  return (
    <div className="pt-2">
      <div
        className="relative mx-auto max-w-xs"
        role="img"
        aria-label={`Application status: ${status}`}
      >
        <div
          className="absolute left-4 right-4 top-[15px] h-0.5 bg-border"
          aria-hidden="true"
        />
        <ol className="relative flex justify-between">
          {APPLICATION_PROGRESS.map((step, index) => {
            const reached = index <= lastReachedIndex
            const isCurrent = !isTerminal && index === currentIndex
            return (
              <li key={step} className="flex w-10 flex-col items-center text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/15'
                      : reached
                      ? 'bg-primary/15 text-primary'
                      : 'border border-border bg-muted text-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {reached && !isCurrent && <Check className="h-4 w-4" />}
                  {!reached && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span
                  className={`mt-2 text-[11px] font-medium leading-tight ${
                    isCurrent ? 'text-primary' : reached ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {stepLabel(step)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
      {isTerminal && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Final status: <strong className="text-foreground">{status}</strong>
        </p>
      )}
    </div>
  )
}