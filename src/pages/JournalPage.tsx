import { useEffect, useState } from 'react'
import { apiFetch, orgParam, type JournalItem, cancelDocument, deleteDraft } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Ban, Trash2 } from 'lucide-react'
import { DOC_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS, fmt, fmtDate } from '../lib/docLabels'
import ContractorPicker from '../components/ContractorPicker'
import type { Contractor } from '../lib/api'

export default function JournalPage() {
  const [docs, setDocs] = useState<JournalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterContractor, setFilterContractor] = useState<Contractor | null>(null)

  async function loadDocs() {
    try {
      const data = await apiFetch<JournalItem[]>(`/doc_journal?${orgParam()}&order=doc_date.desc&limit=100`)
      setDocs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    }
  }

  useEffect(() => {
    loadDocs().finally(() => setLoading(false))
  }, [])

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      await cancelDocument(cancelTarget)
      setCancelTarget(null)
      await loadDocs()
    } catch {
      setCancelError('Ошибка отмены операции')
    } finally {
      setCancelLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteDraft(deleteTarget)
      setDeleteTarget(null)
      await loadDocs()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Ошибка удаления')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = docs.filter(d => {
    if (filterType && d.doc_type !== filterType) return false
    if (filterStatus && d.status !== filterStatus) return false
    if (filterDateFrom && d.doc_date < filterDateFrom) return false
    if (filterDateTo && d.doc_date > filterDateTo) return false
    if (filterContractor && !(d.contractor_name ?? '').toLowerCase().includes(filterContractor.full_name.toLowerCase())) return false
    return true
  })

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>

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

        <div className="w-64">
          <ContractorPicker
            value={filterContractor}
            onChange={setFilterContractor}
            placeholder="Контрагент..."
          />
        </div>

        <span className="text-sm text-zinc-400 self-center">{filtered.length} записей</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Дата</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Контрагент</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Сумма</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
              <th className="px-5 py-2.5"></th>
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
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {d.status === 'posted' && (
                      <button
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        title="Отменить операцию"
                        onClick={() => { setCancelTarget(d.id); setCancelError(null) }}
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    {d.status === 'posted' && (
                      <button
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        title="Удалить документ"
                        onClick={() => setDeleteTarget(d.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {d.status === 'draft' && (
                      <button
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        title="Удалить черновик"
                        onClick={() => { setDeleteTarget(d.id); setDeleteError(null) }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 text-sm">
                  {docs.length === 0 ? 'Документов нет' : 'Нет документов по фильтру'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (() => {
        const targetDoc = docs.find(d => d.id === deleteTarget)
        const isPosted = targetDoc?.status === 'posted'
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-zinc-200 p-6 max-w-sm w-full mx-4">
              {isPosted ? (
                <>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-2">Удаление невозможно</h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    Документ проведён. Для удаления сначала отмените проведение (кнопка <Ban size={12} className="inline" />).
                  </p>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }}>
                      Понятно
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-2">Удалить черновик?</h3>
                  <p className="text-sm text-zinc-500 mb-4">Документ будет удалён без возможности восстановления.</p>
                  {deleteError && <p className="text-red-600 text-sm mb-3">{deleteError}</p>}
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={deleteLoading}>
                      Нет
                    </Button>
                    <Button variant="destructive" onClick={confirmDelete} disabled={deleteLoading}>
                      {deleteLoading ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-zinc-200 p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Отменить операцию?</h3>
            <p className="text-sm text-zinc-500 mb-4">Это действие нельзя отменить.</p>
            {cancelError && <p className="text-red-600 text-sm mb-3">{cancelError}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelError(null) }} disabled={cancelLoading}>
                Нет
              </Button>
              <Button variant="destructive" onClick={confirmCancel} disabled={cancelLoading}>
                {cancelLoading ? 'Отмена...' : 'Отменить операцию'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
