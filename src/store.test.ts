import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addGrainsToBox,
  createBox,
  deleteBox,
  deleteGrain,
  deleteIdea,
  parseGrainLines,
  removeGrainFromBox,
  saveIdea,
  slotsForRestore,
  updateGrain,
  updateIdeaMemo,
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

describe('保存した組み合わせ', () => {
  it('粒の文字列を控えて保存し、粒を編集しても保存時の文字列が残る', async () => {
    const a = await createBox('A')
    await addGrainsToBox(a.id, ['猫'])
    const cat = (await db.grains.toArray())[0]
    const idea = await saveIdea([{ boxId: a.id, grainId: cat.id, anchored: true }], ' メモ ')
    await updateGrain(cat.id, { text: '黒猫' })

    const saved = (await db.savedIdeas.get(idea.id))!
    expect(saved.memo).toBe('メモ')
    expect(saved.slots[0].grainTextSnapshot).toBe('猫')
  })

  it('メモを編集・削除できる', async () => {
    const idea = await saveIdea([], 'a')
    await updateIdeaMemo(idea.id, 'b')
    expect((await db.savedIdeas.get(idea.id))!.memo).toBe('b')
    await deleteIdea(idea.id)
    expect(await db.savedIdeas.count()).toBe(0)
  })

  it('復元時、削除済みの粒や箱は外す', async () => {
    const a = await createBox('A')
    const b = await createBox('B')
    await addGrainsToBox(a.id, ['猫'])
    await addGrainsToBox(b.id, ['犬'])
    const [cat, dog] = await Promise.all(['猫', '犬'].map((t) => db.grains.where('text').equals(t).first()))
    const idea = await saveIdea(
      [
        { boxId: a.id, grainId: cat!.id, anchored: true },
        { boxId: b.id, grainId: dog!.id, anchored: false },
      ],
      '',
    )
    await deleteGrain(cat!.id)
    await deleteBox(b.id)

    expect(await slotsForRestore(idea)).toEqual([
      { boxId: a.id, grainId: null, anchored: false },
      { boxId: null, grainId: dog!.id, anchored: true },
    ])
  })
})
