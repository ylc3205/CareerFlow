const TONE_CHIP = {
  strong: 'chip--success',
  weak: 'chip--danger',
  neutral: 'chip--default',
}

export default function AreaList({ title, areas = [], tone = 'neutral', emptyText = 'Nothing yet' }) {
  return (
    <div className="area-list">
      <h3 className="area-list__title">{title}</h3>
      {areas.length > 0 ? (
        <div className="area-list__chips">
          {areas.map(({ area, count }) => (
            <span key={area} className={`chip ${TONE_CHIP[tone] || TONE_CHIP.neutral}`}>
              {area} <strong>×{count}</strong>
            </span>
          ))}
        </div>
      ) : (
        <p className="area-list__empty">{emptyText}</p>
      )}
    </div>
  )
}