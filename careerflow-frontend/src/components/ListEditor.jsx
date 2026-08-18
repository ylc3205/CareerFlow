import { newItemId } from '../utils/format.js'

export default function ListEditor({ items, onChange, renderItem, addLabel = 'Add item', emptyLabel = 'No items yet', emptyItem = {} }) {
  const addItem = () => {
    onChange([...items, { _cid: newItemId(), ...emptyItem }])
  }

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="list-editor">
      {items.length === 0 ? (
        <p className="list-editor__empty">{emptyLabel}</p>
      ) : (
        <ul className="list-editor__items">
          {items.map((item, index) => (
            <li key={item._cid ?? item._id ?? index} className="list-editor__item">
              <div className="list-editor__body">{renderItem(item, index)}</div>
              <div className="list-editor__actions">
                <button type="button" className="btn btn--danger btn--sm" onClick={() => removeItem(index)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn--ghost btn--sm" onClick={addItem}>
        + {addLabel}
      </button>
    </div>
  )
}