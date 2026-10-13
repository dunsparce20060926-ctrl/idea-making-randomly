import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'
import { storeSlots } from '../slotStorage'
import { deleteIdea, slotsForRestore, updateIdeaMemo } from '../store'
import type { SavedIdea } from '../types'

export function SavedView({ onOpenInGenerate }: { onOpenInGenerate: () => void }) {
  const ideas = useLiveQuery(() => db.savedIdeas.orderBy('createdAt').reverse().toArray(), [])
  const grainTexts = useLiveQuery(async () => new Map((await db.grains.toArray()).map((g) => [g.id, g.text])), [])
  const [search, setSearch] = useState('')

  if (ideas === undefined) return null
  if (ideas.length === 0) {
    return <p className="text-slate-500">まだ保存した組み合わせはありません。「生成」画面の「保存」から保存できます。</p>
  }

  const q = search.trim()
  const textsOf = (idea: SavedIdea) =>
    idea.slots.map((s) => ({
      text: (s.grainId && grainTexts?.get(s.grainId)) || s.grainTextSnapshot || '（空）',
      deleted: !!s.grainId && grainTexts !== undefined && !grainTexts.has(s.grainId),
      anchored: s.anchored,
    }))
  const visible = q
    ? ideas.filter((idea) => idea.memo.includes(q) || textsOf(idea).some((t) => t.text.includes(q)))
    : ideas

  const open = async (idea: SavedIdea) => {
    storeSlots(await slotsForRestore(idea))
    onOpenInGenerate()
  }

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="粒やメモで検索"
        className="w-full rounded border px-3 py-2"
      />
      <ul className="space-y-3">
        {visible.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} texts={textsOf(idea)} onOpen={() => open(idea)} />
        ))}
      </ul>
    </div>
  )
}

interface IdeaCardProps {
  idea: SavedIdea
  texts: { text: string; deleted: boolean; anchored: boolean }[]
  onOpen: () => void
}

function IdeaCard({ idea, texts, onOpen }: IdeaCardProps) {
  const [editing, setEditing] = useState(false)
  const [memo, setMemo] = useState(idea.memo)

  const save = async () => {
    await updateIdeaMemo(idea.id, memo)
    setEditing(false)
  }

  const remove = async () => {
    if (confirm('この組み合わせを削除しますか？')) await deleteIdea(idea.id)
  }

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <p className="text-lg font-bold break-all">
        {texts.map((t, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-1 text-slate-400">×</span>}
            <span className={t.deleted ? 'text-slate-400 line-through' : ''} title={t.deleted ? '削除された粒' : undefined}>
              {t.text}
            </span>
          </span>
        ))}
      </p>

      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded border px-3 py-2"
          />
          <div className="flex gap-2">
            <button onClick={save} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
              保存
            </button>
            <button
              onClick={() => {
                setMemo(idea.memo)
                setEditing(false)
              }}
              className="rounded border px-3 py-1 text-sm"
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="block w-full text-left">
          {idea.memo ? (
            <p className="whitespace-pre-wrap text-slate-700">{idea.memo}</p>
          ) : (
            <p className="text-sm text-slate-400">メモを書く…</p>
          )}
        </button>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="flex-1 text-slate-400">{new Date(idea.createdAt).toLocaleString('ja-JP')}</span>
        <button onClick={onOpen} className="text-indigo-600">
          生成画面で開く
        </button>
        <button onClick={remove} className="text-slate-500 hover:text-red-600">
          削除
        </button>
      </div>
    </li>
  )
}
