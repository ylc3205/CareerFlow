export default function Loading({ label = 'Loading...', fullscreen = false }) {
  return (
    <div className={fullscreen ? 'loading loading--fullscreen' : 'loading'}>
      <span className="spinner" aria-hidden="true" />
      <span className="loading__label">{label}</span>
    </div>
  )
}