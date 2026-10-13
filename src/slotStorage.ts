import type { Slot } from './types'

const STORAGE_KEY = 'idea-app:slots'

/** 画面上でスロットを並べ替えても状態が混ざらないよう、表示用のキーを持たせる */
export type KeyedSlot = Slot & { key: string }

export const emptySlot = (): KeyedSlot => ({ key: crypto.randomUUID(), boxId: null, grainId: null, anchored: false })

export function loadSlots(): KeyedSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0)
        return parsed.map((s: Slot) => ({ ...s, key: crypto.randomUUID() }))
    }
  } catch {
    // 読み込めなければ初期状態で始める
  }
  return [emptySlot(), emptySlot()]
}

/** 生成画面のスロットを保存する。保存済みの組み合わせを生成画面に戻すときにも使う */
export function storeSlots(slots: Slot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots))
  } catch {
    // 保存できなくても動作は続ける
  }
}
