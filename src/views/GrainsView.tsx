import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { BoxChip } from '../components/BoxChip'
import { db } from '../db'
import { deleteGrain, putGrainInBox, removeGrainFromBox, updateGrain } from '../store'
import type { Box, Grain } from '../types'

export function GrainsView() {
  const [search, setSearch] = useState('')
  const grains = useLiveQuery(() => {
    const q = search.trim()
    const all = db.grains.orderBy('text')
    return (q ? all.filter((g) => g.text.includes(q)) : all).toArray()
  }, [search])
  const boxes = useLiveQuery(() => db.boxes.orderBy('name').toArray(), [])
  const membership = useLiveQuery(async () => {
    const map = new Map<string, Set<string>>()
    await db.boxGrains.each((bg) => {
      if (!map.has(bg.grainId)) map.set(bg.grainId, new Set())
      map.get(bg.grainId)!.add(bg.boxId)
    })
    return map
  }, [])

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="粒を検索"
        className="w-full rounded border px-3 py-2"
      />
      <p className="text-sm text-slate-500">
        {grains?.length ?? 0} 粒。粒は「箱」画面から追加できます。ここでは編集と、どの箱に入れるかを変更できます。
      </p>
      <ul className="divide-y rounded border">
        {grains?.map((g) => (
          <GrainRow key={g.id} grain={g} boxes={boxes ?? []} inBoxes={membership?.get(g.id) ?? new Set()} />
        ))}
      </ul>
    </div>
  )
}

function GrainRow({ grain, boxes, inBoxes }: { grain: Grain; boxes: Box[]; inBoxes: Set<string> }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(grain.text)
  const [picking, setPicking] = useState(false)

  const save = async () => {
    if (text.trim() && text.trim() !== grain.text) await updateGrain(grain.id, { text })
    setEditing(false)
  }

  const remove = async () => {
    const n = inBoxes.size
    if (!confirm(`粒「${grain.text}」を削除しますか？${n > 0 ? `${n} 個の箱から外れます。` : ''}`)) return
    await deleteGrain(grain.id)
  }

  const others = boxes.filter((b) => !inBoxes.has(b.id))

  return (
    <li className="space-y-2 px-3 py-3">
      {editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            className="flex-1 rounded border px-2 py-1"
          />
          <button onClick={save} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
            保存
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 break-all">{grain.text}</span>
          <button onClick={() => setEditing(true)} className="text-sm text-slate-500 hover:text-indigo-600">
            編集
          </button>
          <button onClick={remove} className="text-sm text-slate-500 hover:text-red-600">
            削除
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {boxes
          .filter((b) => inBoxes.has(b.id))
          .map((b) => (
            <BoxChip key={b.id} box={b} onRemove={() => removeGrainFromBox(b.id, grain.id)} />
          ))}
        {others.length > 0 && (
          <button onClick={() => setPicking(!picking)} className="rounded-full border px-2 py-0.5 text-xs text-slate-600">
            + 箱に入れる
          </button>
        )}
      </div>
      {picking && (
        <div className="flex flex-wrap gap-1">
          {others.map((b) => (
            <button
              key={b.id}
              onClick={() => putGrainInBox(b.id, grain.id)}
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{ borderColor: b.color, color: b.color }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
