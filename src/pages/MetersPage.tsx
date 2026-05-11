import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'

interface Meter {
  id: string
  plot_id: string | null
  meter_type: string
  serial_number: string
  is_active: boolean
}

interface Plot {
  id: string
  number: string
}

interface MeterRow {
  id: string
  meter_type: string
  serial_number: string
  plot_number: string | null
  is_active: boolean
}

const TYPE_LABELS: Record<string, string> = {
  water: 'Вода',
  electricity: 'Электричество',
}

type TypeFilter = 'all' | 'water' | 'electricity'

export default function MetersPage() {
  const [rows, setRows] = useState<MeterRow[]>([])
  const [filter, setFilter] = useState<TypeFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = orgParam()
    Promise.all([
      apiFetch<Meter[]>(`/meters?${q}&order=serial_number.asc`),
      apiFetch<Plot[]>(`/plots?${q}&select=id,number`),
    ]).then(([meters, plots]) => {
      const pMap = new Map(plots.map(p => [p.id, p.number]))
      setRows(meters.map(m => ({
        id: m.id,
        meter_type: m.meter_type,
        serial_number: m.serial_number,
        plot_number: m.plot_id ? (pMap.get(m.plot_id) ?? null) : null,
        is_active: m.is_active,
      })))
    }).finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => filter === 'all' || r.meter_type === filter)

  const counts = {
    all: rows.length,
    water: rows.filter(r => r.meter_type === 'water').length,
    electricity: rows.filter(r => r.meter_type === 'electricity').length,
  }

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: `Все (${counts.all})` },
    { key: 'water', label: `Вода (${counts.water})` },
    { key: 'electricity', label: `Электричество (${counts.electricity})` },
  ]

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                filter === t.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Серийный номер</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Участок</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 text-zinc-700">{TYPE_LABELS[r.meter_type] ?? r.meter_type}</td>
                <td className="px-5 py-3 font-mono text-zinc-700">{r.serial_number}</td>
                <td className="px-5 py-3 text-zinc-600">{r.plot_number ? `Участок ${r.plot_number}` : '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {r.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-zinc-400">Счётчиков нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
