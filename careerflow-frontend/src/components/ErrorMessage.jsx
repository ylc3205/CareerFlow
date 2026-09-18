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
    <div className="rounded-xl border border-destructive bg-destructive/10 text-destructive p-4" role="alert">
      {message ? <p className="font-medium">{message}</p> : <p className="font-medium">{title}</p>}
      {items.length > 0 && (
        <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
          {items.map((item, index) => (
            <li key={`${item.field}-${index}`}>
              {item.field ? `${item.field}: ` : ''}
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}