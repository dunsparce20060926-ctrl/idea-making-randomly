import type { Box } from '../types'

export function BoxChip({ box, onRemove }: { box: Box; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white"
      style={{ backgroundColor: box.color ?? '#64748b' }}
    >
      {box.name}
      {onRemove && (
        <button onClick={onRemove} aria-label={`${box.name}から外す`} className="opacity-80 hover:opacity-100">
          ×
        </button>
      )}
    </span>
  )
}
