import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'
import {
  BOX_COLORS,
  addGrainsToBox,
  deleteBox,
  parseGrainLines,
  putGrainInBox,
  removeGrainFromBox,
  updateBox,
} from '../store'

export function BoxDetailView({ boxId, onBack }: { boxId: string; onBack: () => void }) {
  const box = useLiveQuery(() => db.boxes.get(boxId), [boxId])
  const grains = useLiveQuery(async () => {
    const ids = (await db.boxGrains.where('boxId').equals(boxId).toArray()).map((bg) => bg.grainId)
    const list = await db.grains.bulkGet(ids)
    return list.filter((g) => g !== undefined).sort((a, b) => a.text.localeCompare(b.text, 'ja'))
  }, [boxId])
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const candidates = useLiveQuery(async () => {
    const q = search.trim()
    if (!q) return []
    const inBox = new Set((await db.boxGrains.where('boxId').equals(boxId).toArray()).map((bg) => bg.grainId))
    return (await db.grains.filter((g) => g.text.includes(q) && !inBox.has(g.id)).limit(20).toArray())
  }, [boxId, search])

  if (box === undefined) return null

  const lines = parseGrainLines(input)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lines.length === 0) return
    const added = await addGrainsToBox(boxId, lines)
    setInput('')
    setMessage(added === lines.length ? `${added} 粒を追加しました` : `${added} 粒を追加しました（${lines.length - added} 粒はすでに入っていました）`)
  }

  const rename = async () => {
    const name = prompt('箱の名前', box.name)?.trim()
    if (name) await updateBox(boxId, { name })
  }

  const remove = async () => {
    if (!confirm(`箱「${box.name}」を削除しますか？中の粒は粒一覧や他の箱に残ります。`)) return
    await deleteBox(boxId)
    onBack()
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-indigo-600">
        ← 箱一覧
      </button>

      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-xl font-bold">{box.name}</h2>
        <button onClick={rename} className="rounded border px-3 py-1 text-sm">
          名前変更
        </button>
        <button onClick={remove} className="rounded border border-red-300 px-3 py-1 text-sm text-red-600">
          削除
        </button>
      </div>

      <div className="flex gap-2">
        {BOX_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => updateBox(boxId, { color: c })}
            aria-label={`色 ${c}`}
            className={`h-7 w-7 rounded-full ${box.color === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <form onSubmit={add} className="space-y-2">
        <label className="block text-sm font-medium">粒を追加（1行に1つ。まとめて貼り付けできます）</label>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setMessage('')
          }}
          rows={4}
          placeholder={'猫\nサブスク\n水中で使える'}
          className="w-full rounded border px-3 py-2"
        />
        <div className="flex items-center gap-3">
          <button className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={lines.length === 0}>
            {lines.length > 0 ? `${lines.length} 粒を追加` : '追加'}
          </button>
          {message && <span className="text-sm text-emerald-700">{message}</span>}
        </div>
      </form>

      <div className="space-y-2">
        <label className="block text-sm font-medium">他の箱にある粒をこの箱にも入れる</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="粒を検索"
          className="w-full rounded border px-3 py-2"
        />
        {candidates && candidates.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {candidates.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => putGrainInBox(boxId, g.id)}
                  className="rounded-full border px-3 py-1 text-sm hover:bg-slate-50"
                >
                  + {g.text}
                </button>
              </li>
            ))}
          </ul>
        )}
        {search.trim() && candidates?.length === 0 && <p className="text-sm text-slate-500">該当する粒はありません</p>}
      </div>

      <div>
        <h3 className="mb-2 font-medium">この箱の粒（{grains?.length ?? 0}）</h3>
        {grains?.length === 0 && <p className="text-slate-500">まだ粒がありません。</p>}
        <ul className="divide-y rounded border">
          {grains?.map((g) => (
            <li key={g.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 break-all">{g.text}</span>
              <button
                onClick={() => removeGrainFromBox(boxId, g.id)}
                className="text-sm text-slate-500 hover:text-red-600"
              >
                箱から外す
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
