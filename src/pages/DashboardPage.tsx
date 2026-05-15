import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, orgParam, type JournalItem } from '../lib/api'
import { Button } from '@/components/ui/button'
import PaymentDialog from '../components/PaymentDialog'
import { DOC_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, fmt, fmtDate } from '../lib/docLabels'

interface ObjectDebt {
  total_debt: number
}

interface PlotSummaryItem { id: string }
interface ContractorItem { id: string }

export default function DashboardPage() {
  const [docs, setDocs] = useState<JournalItem[]>([])
  const [plotCount, setPlotCount] = useState<number | null>(null)
  const [contractorCount, setContractorCount] = useState<number | null>(null)
  const [totalDebt, setTotalDebt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [paymentOpen, setPaymentOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    const q = orgParam()
    Promise.all([
      apiFetch<JournalItem[]>(`/doc_journal?${q}&order=doc_date.desc&limit=20`),
      apiFetch<PlotSummaryItem[]>(`/plot_summary?${q}&select=id`),
      apiFetch<ContractorItem[]>(`/contractors?${q}&select=id`),
      apiFetch<ObjectDebt[]>(`/object_debts?${q}&select=total_debt`),
    ]).then(([d, plots, contractors, debts]) => {
      setDocs(d)
      setPlotCount(plots.length)
      setContractorCount(contractors.length)
      const sum = debts.reduce((acc, row) => acc + (row.total_debt ?? 0), 0)
      setTotalDebt(sum)
    }).finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      {/* Quick-action header */}
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={() => setPaymentOpen(true)}>
          + Принять платёж
        </Button>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link to="/plots" className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 transition-colors">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Участков</p>
          <p className="text-2xl font-bold text-zinc-900">{plotCount ?? '—'}</p>
        </Link>
        <Link to="/counterparties" className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 transition-colors">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Контрагентов</p>
          <p className="text-2xl font-bold text-zinc-900">{contractorCount ?? '—'}</p>
        </Link>
        <Link to="/debtors" className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 transition-colors">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Общий долг</p>
          <p className="text-2xl font-bold text-red-600">
            {totalDebt !== null ? fmt(totalDebt) : '—'}
          </p>
        </Link>
      </div>

      {/* Таблица операций */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Последние операции</h2>
        </div>
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
            {docs.map((d, i) => (
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
            {docs.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-sm">Операций нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onPosted={() => { setRefreshKey(k => k + 1) }}
      />
    </div>
  )
}
