import { useEffect, useState } from 'react'
import { apiFetch, orgParam, DebtorItem } from '../lib/api'

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DebtorsPage() {
  const [rows, setRows] = useState<DebtorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<DebtorItem[]>(`/debtors?${orgParam()}&order=total_debt.desc`)
      .then(setRows)
      .catch(e => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>

  const totalDebt = rows.reduce((s, r) => s + r.total_debt, 0)

  return (
    <div>
      {/* Summary */}
      {rows.length > 0 && (
        <p className="text-sm text-zinc-500 mb-5">
          {rows.length} объектов с долгом · общий долг{' '}
          <span className="text-red-600 font-semibold">−{fmt(totalDebt)} BYN</span>
        </p>
      )}

      {rows.length === 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 px-5 py-10 text-center text-zinc-400 text-sm">
          Долгов нет
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {rows.map(row => (
          <div key={`${row.object_type}:${row.object_id}`} className="bg-white rounded-lg border border-zinc-200 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{row.object_name}</p>
                <p className="text-sm text-zinc-400 mt-0.5 truncate">{row.owner_name}</p>
              </div>
              <p className="text-lg font-bold text-red-600 whitespace-nowrap shrink-0">
                −{fmt(row.total_debt)} BYN
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
