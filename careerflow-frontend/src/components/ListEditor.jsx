import { Plus } from 'lucide-react'
import { Button } from './ui/button.jsx'
import { newItemId } from '../utils/format.js'

export default function ListEditor({ items, onChange, renderItem, addLabel = 'Add item', emptyLabel = 'No items yet', emptyItem = {} }) {
  const addItem = () => {
    onChange([...items, { _cid: newItemId(), ...emptyItem }])
  }

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, index) => (
            <li key={item._cid ?? item._id ?? index} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div>{renderItem(item, index)}</div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeItem(index)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  )
}