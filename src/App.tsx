import { useState } from 'react'

const tabs = [
  { id: 'generate', label: '生成' },
  { id: 'boxes', label: '箱' },
  { id: 'grains', label: '粒' },
  { id: 'saved', label: '保存済み' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function App() {
  const [tab, setTab] = useState<TabId>('generate')
  const current = tabs.find((t) => t.id === tab)!

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-white text-slate-900">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-bold">アイディア生成</h1>
      </header>
      <main className="flex-1 p-4">
        <p className="text-slate-500">「{current.label}」画面は準備中です。</p>
      </main>
      <nav className="sticky bottom-0 grid grid-cols-4 border-t bg-white">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 text-sm ${t.id === tab ? 'font-bold text-indigo-600' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
