import { db, newId } from './db'
import type { Box, Grain } from './types'

export const BOX_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
]

// ---- 箱 ----

export async function createBox(name: string): Promise<Box> {
  const now = Date.now()
  const count = await db.boxes.count()
  const box: Box = {
    id: newId(),
    name: name.trim(),
    color: BOX_COLORS[count % BOX_COLORS.length],
    createdAt: now,
    updatedAt: now,
  }
  await db.boxes.add(box)
  return box
}

export async function updateBox(id: string, changes: Partial<Pick<Box, 'name' | 'color' | 'description'>>) {
  await db.boxes.update(id, { ...changes, updatedAt: Date.now() })
}

/** 箱を削除する。中の粒は他の箱や粒一覧に残る */
export async function deleteBox(id: string) {
  await db.transaction('rw', db.boxes, db.boxGrains, async () => {
    await db.boxGrains.where('boxId').equals(id).delete()
    await db.boxes.delete(id)
  })
}

// ---- 粒 ----

/** 改行区切りのテキストを粒のリストに分解する。空行と重複は除く */
export function parseGrainLines(input: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const line of input.split(/\r?\n/)) {
    const text = line.trim()
    if (text && !seen.has(text)) {
      seen.add(text)
      result.push(text)
    }
  }
  return result
}

/**
 * 粒をまとめて箱に追加する。
 * 同じ文字列の粒がすでにあれば新しく作らず、その粒を箱に入れる（同じ粒を複数の箱で共有する）。
 * 戻り値は新しく箱に入った粒の数。
 */
export async function addGrainsToBox(boxId: string, texts: string[]): Promise<number> {
  let added = 0
  await db.transaction('rw', db.grains, db.boxGrains, async () => {
    for (const text of texts) {
      let grain = await db.grains.where('text').equals(text).first()
      if (!grain) {
        const now = Date.now()
        grain = { id: newId(), text, createdAt: now, updatedAt: now }
        await db.grains.add(grain)
      }
      const exists = await db.boxGrains.get([boxId, grain.id])
      if (!exists) {
        await db.boxGrains.add({ boxId, grainId: grain.id })
        added++
      }
    }
  })
  return added
}

export async function createGrain(text: string): Promise<Grain> {
  const t = text.trim()
  const existing = await db.grains.where('text').equals(t).first()
  if (existing) return existing
  const now = Date.now()
  const grain: Grain = { id: newId(), text: t, createdAt: now, updatedAt: now }
  await db.grains.add(grain)
  return grain
}

export async function updateGrain(id: string, changes: Partial<Pick<Grain, 'text' | 'note'>>) {
  const patch = { ...changes, updatedAt: Date.now() }
  if (patch.text !== undefined) patch.text = patch.text.trim()
  await db.grains.update(id, patch)
}

/** 粒を完全に削除する（すべての箱から外れる） */
export async function deleteGrain(id: string) {
  await db.transaction('rw', db.grains, db.boxGrains, async () => {
    await db.boxGrains.where('grainId').equals(id).delete()
    await db.grains.delete(id)
  })
}

export async function putGrainInBox(boxId: string, grainId: string) {
  const exists = await db.boxGrains.get([boxId, grainId])
  if (!exists) await db.boxGrains.add({ boxId, grainId })
}

export async function removeGrainFromBox(boxId: string, grainId: string) {
  await db.boxGrains.delete([boxId, grainId])
}
