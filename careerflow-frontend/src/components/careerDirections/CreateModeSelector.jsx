import { PenLine, Sparkles, Brain, LayoutTemplate } from 'lucide-react'

const MODES = [
  {
    id: 'manual',
    icon: PenLine,
    title: 'Manual',
    description: 'Build your career direction yourself.',
  },
  {
    id: 'ai_from_idea',
    icon: Sparkles,
    title: 'AI from Idea',
    description: 'Describe the career path you want, and AI will help structure it.',
  },
  {
    id: 'ai_from_background',
    icon: Brain,
    title: 'AI from Background',
    description: 'Let AI analyze the background you choose to share and suggest a direction.',
  },
  {
    id: 'template_based',
    icon: LayoutTemplate,
    title: 'From Role Template',
    description: 'Start from a role and let AI personalize the direction.',
  },
]

const cardClass = "relative flex flex-col h-full cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/20"
const iconClass = "mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
const titleClass = "text-sm font-semibold"
const descClass = "mt-1 text-sm text-muted-foreground"
const selectedClass = "border-primary bg-primary/5 ring-2 ring-primary/20"

export default function CreateModeSelector({ selectedMode, onSelect, disabled = false }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Creation mode">
      {MODES.map((mode) => {
        const isSelected = selectedMode === mode.id
        const Icon = mode.icon
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => !disabled && onSelect(mode.id)}
            disabled={disabled}
            className={cn(cardClass, isSelected && selectedClass)}
            tabIndex={disabled ? -1 : 0}
          >
            <div className={iconClass}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className={titleClass}>{mode.title}</h3>
            <p className={descClass}>{mode.description}</p>
          </button>
        )
      })}
    </div>
  )
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}