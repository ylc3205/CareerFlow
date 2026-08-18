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

export default function ErrorMessage({ title = 'Something went wrong', message, errors, variant = 'banner' }) {
  const items = fieldErrorList(errors)

  return (
    <div className={`error error--${variant}`} role="alert">
      {message ? <p className="error__title">{message}</p> : <p className="error__title">{title}</p>}
      {items.length > 0 && (
        <ul className="error__list">
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