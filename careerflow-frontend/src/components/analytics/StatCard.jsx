import { Card, CardContent } from '../ui/card.jsx'

export default function StatCard({ label, value, hint }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="font-mono text-3xl tabular-nums leading-none">{value}</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground opacity-75">{hint}</div>}
      </CardContent>
    </Card>
  )
}