import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'
import { Input } from '@/components/ui/input'

interface PlotSummary {
  id: string
  number: string
  area: number
  is_active: boolean
  owner_name: string | null
  owner_phone: string | null
}

type FilterTab = 'all' | 'active' | 'inactive'

export default function PlotsPage() {
  const [plots, setPlots] = useState<PlotSummary[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<PlotSummary[]>(`/plot_summary?${orgParam()}&order=number.asc`)
      .then(setPlots)
      .finally(() => setLoading(false))
  }, [])

  const filtered = plots
    .filter(p => tab === 'all' ? true : tab === 'active' ? p.is_active : !p.is_active)
    .filter(p => !search || (p.owner_name ?? '').toLowerCase().includes(search.toLowerCase()) || p.number.includes(search))

  const counts = {
    all: plots.length,
    active: plots.filter(p => p.is_active).length,
    inactive: plots.filter(p => !p.is_active).length,
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `Все (${counts.all})` },
    { key: 'active', label: `Активные (${counts.active})` },
    { key: 'inactive', label: `Неактивные (${counts.inactive})` },
  ]

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                tab === t.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Поиск по владельцу или номеру..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">№</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Площадь</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Владелец</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Телефон</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 font-semibold text-zinc-900">{p.number}</td>
                <td className="px-5 py-3 text-zinc-600">{p.area.toFixed(2)} сот.</td>
                <td className="px-5 py-3 text-zinc-700">{p.owner_name ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-600">{p.owner_phone ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {p.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
