import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db'
import { generate, type SlotError } from '../generate'
import { type KeyedSlot, emptySlot, loadSlots, storeSlots } from '../slotStorage'
import { saveIdea } from '../store'
import type { Box, Slot } from '../types'

const ERROR_TEXT: Record<SlotError, string> = {
  'empty-box': 'この箱には粒がありません',
  'no-source': '箱を選ぶか、粒を指定してください',
}

export function GenerateView() {
  const [slots, setSlots] = useState<KeyedSlot[]>(loadSlots)
  const [errors, setErrors] = useState<(SlotError | null)[]>([])
  const [saving, setSaving] = useState(false)
  const [memo, setMemo] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const boxes = useLiveQuery(() => db.boxes.orderBy('name').toArray(), [])
  const grainIds = slots.map((s) => s.grainId).filter((id): id is string => !!id)
  const grainTexts = useLiveQuery(async () => {
    const list = await db.grains.bulkGet(grainIds)
    return new Map(list.filter((g) => g !== undefined).map((g) => [g.id, g.text]))
  }, [grainIds.join(',')])

  useEffect(() => storeSlots(slots), [slots])

  const resetSave = () => {
    setSaving(false)
    setSavedMessage('')
  }

  const save = async () => {
    await saveIdea(slots, memo)
    setMemo('')
    setSaving(false)
    setSavedMessage('保存しました')
  }

  const update = (i: number, slot: Slot) => {
    setSlots(slots.map((s, j) => (j === i ? { ...slot, key: s.key } : s)))
    resetSave()
    setErrors([])
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= slots.length) return
    const next = [...slots]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSlots(next)
    resetSave()
    setErrors([])
  }

  const remove = (i: number) => {
    setSlots(slots.filter((_, j) => j !== i))
    resetSave()
    setErrors([])
  }

  const run = async () => {
    const boxGrainIds = new Map<string, string[]>()
    await db.boxGrains.each((bg) => {
      if (!boxGrainIds.has(bg.boxId)) boxGrainIds.set(bg.boxId, [])
      boxGrainIds.get(bg.boxId)!.push(bg.grainId)
    })
    const result = generate(slots, boxGrainIds)
    setSlots(result.slots as KeyedSlot[])
    resetSave()
    setErrors(result.errors)
  }

  if (boxes === undefined) return null
  if (boxes.length === 0) {
    return <p className="text-slate-500">まずは「箱」タブで箱を作り、粒を入れてください。</p>
  }

  const anchoredCount = slots.filter((s) => s.anchored).length
  const complete = slots.length > 0 && slots.every((s) => s.grainId)

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {slots.map((slot, i) => (
          <SlotCard
            key={slot.key}
            index={i}
            total={slots.length}
            slot={slot}
            boxes={boxes}
            grainText={slot.grainId ? grainTexts?.get(slot.grainId) : undefined}
            error={errors[i] ?? null}
            onChange={(s) => update(i, s)}
            onMove={(d) => move(i, d)}
            onRemove={() => remove(i)}
          />
        ))}
      </ol>

      <button
        onClick={() => setSlots([...slots, emptySlot()])}
        className="w-full rounded border border-dashed py-2 text-sm text-slate-600"
      >
        + スロットを追加
      </button>

      {saving && (
        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
          <textarea
            autoFocus
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="メモ（思いついたこと、使い道など。空でも保存できます）"
            className="w-full rounded border bg-white px-3 py-2"
          />
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 rounded bg-emerald-600 py-2 font-bold text-white">
              保存する
            </button>
            <button onClick={() => setSaving(false)} className="rounded border px-4 py-2">
              やめる
            </button>
          </div>
        </div>
      )}

      <div className="sticky bottom-14 flex gap-2 bg-white pt-2">
        <button
          onClick={run}
          disabled={slots.length === 0 || anchoredCount === slots.length}
          className="flex-1 rounded-lg bg-indigo-600 py-3 text-lg font-bold text-white disabled:opacity-40"
        >
          {anchoredCount > 0 ? `固定以外を引き直す（${slots.length - anchoredCount}）` : '生成'}
        </button>
        <button
          onClick={() => setSaving(true)}
          disabled={!complete || saving}
          className="rounded-lg border-2 border-emerald-600 px-4 font-bold text-emerald-700 disabled:opacity-40"
        >
          {savedMessage || '保存'}
        </button>
      </div>
    </div>
  )
}

interface SlotCardProps {
  index: number
  total: number
  slot: Slot
  boxes: Box[]
  grainText?: string
  error: SlotError | null
  onChange: (slot: Slot) => void
  onMove: (d: -1 | 1) => void
  onRemove: () => void
}

const DIRECT = '__direct__'

function SlotCard({ index, total, slot, boxes, grainText, error, onChange, onMove, onRemove }: SlotCardProps) {
  const box = boxes.find((b) => b.id === slot.boxId)
  const [direct, setDirect] = useState(slot.boxId === null && slot.grainId !== null)
  const [search, setSearch] = useState('')
  const candidates = useLiveQuery(async () => {
    const q = search.trim()
    if (!direct || !q) return []
    return db.grains.filter((g) => g.text.includes(q)).limit(20).toArray()
  }, [direct, search])

  const selectSource = (value: string) => {
    if (value === DIRECT) {
      setDirect(true)
      onChange({ boxId: null, grainId: null, anchored: false })
    } else {
      setDirect(false)
      onChange({ boxId: value || null, grainId: null, anchored: false })
    }
  }

  return (
    <li
      className={`rounded-lg border-2 p-3 ${slot.anchored ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}
      style={box && !slot.anchored ? { borderColor: box.color } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{index + 1}</span>
        <select
          value={direct ? DIRECT : (slot.boxId ?? '')}
          onChange={(e) => selectSource(e.target.value)}
          className="min-w-0 flex-1 rounded border bg-white px-2 py-1 text-sm"
        >
          <option value="">箱を選ぶ…</option>
          {boxes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value={DIRECT}>粒を直接指定する</option>
        </select>
        <button onClick={() => onMove(-1)} disabled={index === 0} className="px-1 text-slate-500 disabled:opacity-30" aria-label="上へ">
          ↑
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="px-1 text-slate-500 disabled:opacity-30"
          aria-label="下へ"
        >
          ↓
        </button>
        <button onClick={onRemove} className="px-1 text-slate-400 hover:text-red-600" aria-label="スロットを削除">
          ×
        </button>
      </div>

      {grainText !== undefined ? (
        <button
          onClick={() => !direct && onChange({ ...slot, anchored: !slot.anchored })}
          className="mt-2 flex w-full items-center gap-2 text-left"
          aria-pressed={slot.anchored}
        >
          <span className="flex-1 text-2xl font-bold break-all">{grainText}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${slot.anchored ? 'bg-amber-400 text-white' : 'border text-slate-500'}`}>
            {slot.anchored ? '📌 固定中' : '固定する'}
          </span>
        </button>
      ) : (
        !direct && <p className="mt-2 text-lg text-slate-300">？</p>
      )}

      {direct && (
        <div className="mt-2 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={grainText !== undefined ? '別の粒を検索' : '固定する粒を検索'}
            className="w-full rounded border px-2 py-1 text-sm"
          />
          {candidates && candidates.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {candidates.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    onChange({ boxId: null, grainId: g.id, anchored: true })
                    setSearch('')
                  }}
                  className="rounded-full border px-2 py-0.5 text-sm"
                >
                  {g.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{ERROR_TEXT[error]}</p>}
    </li>
  )
}
