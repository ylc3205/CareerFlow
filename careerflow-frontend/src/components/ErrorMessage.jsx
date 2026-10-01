import { AlertCircle } from 'lucide-react'

const fieldErrorList = (errors) => {
  if (!errors) return []
  if (Array.isArray(errors)) return errors
  // Zod fieldErrors shape: { field: ["message", ...] }
  if (typeof errors === 'object') {
    return Object.entries(errors).flatMap(([field, messages]) =>
      (Array.isArray(messages) ? messages : [messages]).map((message) => ({ field, message }))
    )
  }
  return []
}

export default function ErrorMessage({ title = 'Something went wrong', message, errors }) {
  const items = fieldErrorList(errors)

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-foreground animate-fade-in"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {message ? <p className="text-sm font-medium">{message}</p> : <p className="text-sm font-medium">{title}</p>}
        {items.length > 0 && (
          <ul className="mt-1.5 list-disc list-inside space-y-1 text-xs text-muted-foreground">
            {items.map((item, index) => (
              <li key={`${item.field}-${index}`}>
                {item.field ? `${item.field}: ` : ''}
                {item.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}