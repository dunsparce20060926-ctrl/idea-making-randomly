import { describe, expect, it } from 'vitest'
import { generate } from './generate'
import type { Slot } from './types'

const box = (boxId: string): Slot => ({ boxId, grainId: null, anchored: false })

describe('generate', () => {
  const boxes = new Map([
    ['A', ['a1', 'a2']],
    ['B', ['b1']],
    ['shared', ['a1', 'x']],
    ['empty', []],
  ])

  it('箱スロットごとに箱の中から1粒引く', () => {
    const { slots, errors } = generate([box('A'), box('B')], boxes, () => 0)
    expect(slots.map((s) => s.grainId)).toEqual(['a1', 'b1'])
    expect(errors).toEqual([null, null])
  })

  it('固定スロットは変わらない', () => {
    const anchored: Slot = { boxId: 'A', grainId: 'a2', anchored: true }
    const { slots } = generate([anchored, box('B')], boxes, () => 0)
    expect(slots[0]).toBe(anchored)
  })

  it('箱を持たない固定スロット（粒×箱×箱）を扱える', () => {
    const anchored: Slot = { boxId: null, grainId: 'free', anchored: true }
    const { slots, errors } = generate([anchored, box('A')], boxes, () => 0)
    expect(slots.map((s) => s.grainId)).toEqual(['free', 'a1'])
    expect(errors).toEqual([null, null])
  })

  it('同じ粒が別の箱に入っていても、可能なら重複を避ける', () => {
    const { slots } = generate([box('A'), box('shared')], boxes, () => 0)
    expect(slots.map((s) => s.grainId)).toEqual(['a1', 'x'])
  })

  it('避けられない重複は許す', () => {
    const { slots } = generate([box('B'), box('B')], boxes, () => 0)
    expect(slots.map((s) => s.grainId)).toEqual(['b1', 'b1'])
  })

  it('空の箱はエラーを返す', () => {
    const { slots, errors } = generate([box('empty')], boxes, () => 0)
    expect(slots[0].grainId).toBeNull()
    expect(errors).toEqual(['empty-box'])
  })
})
