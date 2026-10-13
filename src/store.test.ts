import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addGrainsToBox,
  createBox,
  deleteBox,
  deleteGrain,
  parseGrainLines,
  removeGrainFromBox,
  updateGrain,
} from './store'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('parseGrainLines', () => {
  it('空行・前後の空白・重複を取り除く', () => {
    expect(parseGrainLines(' 猫 \n\n犬\n猫\r\n水中で使える ')).toEqual(['猫', '犬', '水中で使える'])
  })
})

describe('箱と粒', () => {
  it('同じ文字列の粒は別の箱でも1つの粒として共有される', async () => {
    const a = await createBox('動物')
    const b = await createBox('ペット')
    await addGrainsToBox(a.id, ['猫', '象'])
    await addGrainsToBox(b.id, ['猫'])

    expect(await db.grains.count()).toBe(2)
    const cat = await db.grains.where('text').equals('猫').first()
    expect(await db.boxGrains.where('grainId').equals(cat!.id).count()).toBe(2)
  })

  it('同じ箱に同じ粒を二重に入れない', async () => {
    const a = await createBox('動物')
    expect(await addGrainsToBox(a.id, ['猫'])).toBe(1)
    expect(await addGrainsToBox(a.id, ['猫'])).toBe(0)
    expect(await db.boxGrains.count()).toBe(1)
  })

  it('粒を編集すると全ての箱に反映される（実体は1つ）', async () => {
    const a = await createBox('A')
    const b = await createBox('B')
    await addGrainsToBox(a.id, ['猫'])
    await addGrainsToBox(b.id, ['猫'])
    const cat = (await db.grains.toArray())[0]
    await updateGrain(cat.id, { text: ' 黒猫 ' })
    expect((await db.grains.get(cat.id))!.text).toBe('黒猫')
  })

  it('箱を削除しても粒は残る', async () => {
    const a = await createBox('A')
    await addGrainsToBox(a.id, ['猫'])
    await deleteBox(a.id)
    expect(await db.boxes.count()).toBe(0)
    expect(await db.boxGrains.count()).toBe(0)
    expect(await db.grains.count()).toBe(1)
  })

  it('箱から外しても粒は残り、粒を削除すると全ての箱から消える', async () => {
    const a = await createBox('A')
    const b = await createBox('B')
    await addGrainsToBox(a.id, ['猫'])
    await addGrainsToBox(b.id, ['猫'])
    const cat = (await db.grains.toArray())[0]

    await removeGrainFromBox(a.id, cat.id)
    expect(await db.grains.count()).toBe(1)
    expect(await db.boxGrains.count()).toBe(1)

    await deleteGrain(cat.id)
    expect(await db.grains.count()).toBe(0)
    expect(await db.boxGrains.count()).toBe(0)
  })

  it('箱の色は順番に割り当てられる', async () => {
    const a = await createBox('A')
    const b = await createBox('B')
    expect(a.color).not.toBe(b.color)
  })
})
