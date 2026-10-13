import type { Slot } from './types'

export type Rng = () => number

export type SlotError = 'empty-box' | 'no-source'

export interface GenerateResult {
  slots: Slot[]
  errors: (SlotError | null)[]
}

/**
 * 固定されていないスロットだけを引き直す。
 * boxGrainIds: 箱ID → その箱に入っている粒IDの一覧
 * 同じ組み合わせ内で粒が重複しないよう、可能な限り別の粒を選ぶ。
 */
export function generate(
  slots: Slot[],
  boxGrainIds: Map<string, string[]>,
  rng: Rng = Math.random,
): GenerateResult {
  const used = new Set<string>()
  for (const s of slots) if (s.anchored && s.grainId) used.add(s.grainId)

  const errors: (SlotError | null)[] = []
  const result = slots.map((slot) => {
    if (slot.anchored) {
      errors.push(slot.grainId ? null : 'no-source')
      return slot
    }
    if (!slot.boxId) {
      errors.push('no-source')
      return { ...slot, grainId: null }
    }
    const candidates = boxGrainIds.get(slot.boxId) ?? []
    if (candidates.length === 0) {
      errors.push('empty-box')
      return { ...slot, grainId: null }
    }
    const fresh = candidates.filter((id) => !used.has(id))
    const pool = fresh.length > 0 ? fresh : candidates
    const grainId = pool[Math.floor(rng() * pool.length)]
    used.add(grainId)
    errors.push(null)
    return { ...slot, grainId }
  })
  return { slots: result, errors }
}
