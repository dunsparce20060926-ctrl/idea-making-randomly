import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'
import { createBox } from '../store'

export function BoxesView({ onOpen }: { onOpen: (boxId: string) => void }) {
  const boxes = useLiveQuery(() => db.boxes.orderBy('updatedAt').reverse().toArray(), [])
  const counts = useLiveQuery(async () => {
    const map = new Map<string, number>()
    await db.boxGrains.each((bg) => map.set(bg.boxId, (map.get(bg.boxId) ?? 0) + 1))
    return map
  }, [])
  const [name, setName] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const box = await createBox(name)
    setName('')
    onOpen(box.id)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新しい箱の名前（例: 職業、素材、動詞）"
          className="flex-1 rounded border px-3 py-2"
        />
        <button className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={!name.trim()}>
          作成
        </button>
      </form>

      {boxes?.length === 0 && <p className="text-slate-500">まだ箱がありません。上の欄から作成してください。</p>}

      <ul className="space-y-2">
        {boxes?.map((box) => (
          <li key={box.id}>
            <button
              onClick={() => onOpen(box.id)}
              className="flex w-full items-center gap-3 rounded border px-3 py-3 text-left hover:bg-slate-50"
            >
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: box.color }} />
              <span className="flex-1 font-medium">{box.name}</span>
              <span className="text-sm text-slate-500">{counts?.get(box.id) ?? 0} 粒</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
