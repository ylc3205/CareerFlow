import { Card, CardContent } from '../ui/card.jsx'

export default function StatCard({ label, value, hint }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 truncate font-mono text-3xl font-bold tabular-nums leading-none text-foreground">{value}</p>
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}