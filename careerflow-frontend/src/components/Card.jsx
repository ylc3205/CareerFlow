export default function Card({ children, className = '', ...props }) {
  const classes = ['card', className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}