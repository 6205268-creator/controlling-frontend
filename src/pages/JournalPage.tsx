import { useEffect, useState } from 'react'
import { apiFetch, orgParam, type JournalItem } from '../lib/api'
import { Input } from '@/components/ui/input'

const DOC_TYPE_LABELS: Record<string, string> = {
  payment: 'Платёж',
  accrual: 'Начисление',
  distribution: 'Распределение',
  meter_reading: 'Показание счётчика',
  meter_charge: 'Начисление по счётчику',
  period_close: 'Закрытие периода',
  meter_correction: 'Корректировка счётчика',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  posted: 'Проведён',
  cancelled: 'Отменён',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  posted: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function fmt(amount: number | null): string {
  if (amount === null) return '—'
  return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' BYN'
}

function fmtDate(d: string): string {
  return d.split('-').reverse().join('.')
}

export default function JournalPage() {
  const [docs, setDocs] = useState<JournalItem[]>([])
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterContractor, setFilterContractor] = useState('')

  useEffect(() => {
    apiFetch<JournalItem[]>(`/doc_journal?${orgParam()}&order=doc_date.desc&limit=100`)
      .then(setDocs)
      .finally(() => setLoading(false))
  }, [])

  const filtered = docs.filter(d => {
    if (filterType && d.doc_type !== filterType) return false
    if (filterStatus && d.status !== filterStatus) return false
    if (filterDateFrom && d.doc_date < filterDateFrom) return false
    if (filterDateTo && d.doc_date > filterDateTo) return false
    if (filterContractor && !(d.contractor_name ?? '').toLowerCase().includes(filterContractor.toLowerCase())) return false
    return true
  })

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white text-zinc-700 min-w-[160px]"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">Все типы</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white text-zinc-700 min-w-[140px]"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="w-36"
          />
          <span className="text-zinc-400 text-sm">—</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="w-36"
          />
        </div>

        <Input
          placeholder="Плательщик..."
          value={filterContractor}
          onChange={e => setFilterContractor(e.target.value)}
          className="max-w-xs"
        />

        <span className="text-sm text-zinc-400 self-center">{filtered.length} записей</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Дата</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Плательщик</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Сумма</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 text-zinc-600">{fmtDate(d.doc_date)}</td>
                <td className="px-5 py-3 text-zinc-700">{DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type}</td>
                <td className="px-5 py-3 text-zinc-700">{d.contractor_name ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-700">{fmt(d.amount)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-sm">
                  {docs.length === 0 ? 'Документов нет' : 'Нет документов по фильтру'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
