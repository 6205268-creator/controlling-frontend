import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  apiFetch, orgParam, type JournalItem, type PlotSummary,
  cancelDocument, deleteDraft, unpostOwnership, postOwnership, postPayment,
} from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, FileEdit, CheckCircle2 } from 'lucide-react'
import { DOC_TYPE_LABELS, STATUS_LABELS, fmt, fmtDate } from '../lib/docLabels'
import ContractorPicker from '../components/ContractorPicker'
import OwnershipDialog, { type PlotOption } from '../components/OwnershipDialog'
import type { Contractor } from '../lib/api'

export default function JournalPage() {
  const [searchParams] = useSearchParams()
  const [docs, setDocs] = useState<JournalItem[]>([])
  const [plots, setPlots] = useState<PlotOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cancelTarget, setCancelTarget] = useState<JournalItem | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [ownershipOpen, setOwnershipOpen] = useState(false)
  const [postingId, setPostingId] = useState<string | null>(null)
  const [postError, setPostError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState(searchParams.get('type') ?? '')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get('date') ?? '')
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get('date') ?? '')
  const [filterContractor, setFilterContractor] = useState<Contractor | null>(null)

  async function loadDocs() {
    try {
      const data = await apiFetch<JournalItem[]>(`/doc_journal?${orgParam()}&order=doc_date.desc&limit=100`)
      setDocs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    }
  }

  async function loadPlots() {
    try {
      const data = await apiFetch<PlotSummary[]>(`/plot_summary?${orgParam()}`)
      setPlots([...data]
        .sort((a, b) => parseInt(a.number) - parseInt(b.number))
        .map(p => ({ id: p.id, number: p.number, owner_name: p.owner_name })))
    } catch { /* plots optional for non-ownership actions */ }
  }

  useEffect(() => {
    Promise.all([loadDocs(), loadPlots()]).finally(() => setLoading(false))
  }, [])

  function openOwnershipDraft(doc: JournalItem) {
    setEditDocId(doc.id)
    setOwnershipOpen(true)
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      if (cancelTarget.doc_type === 'ownership') {
        const unpostId = cancelTarget.own_id ?? cancelTarget.id
        const r = await unpostOwnership(unpostId)
        if (!r.ok) throw new Error(r.error ?? 'Ошибка отмены проведения')
      } else {
        const r = await cancelDocument(cancelTarget.id)
        if (!r.ok) throw new Error(r.error ?? 'Ошибка отмены')
      }
      setCancelTarget(null)
      await loadDocs()
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Ошибка отмены операции')
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

  async function handlePost(d: JournalItem) {
    setPostingId(d.id)
    setPostError(null)
    try {
      let r
      if (d.doc_type === 'ownership') {
        r = await postOwnership(d.own_id ?? d.id)
      } else if (d.doc_type === 'payment') {
        r = await postPayment(d.id)
      } else {
        throw new Error(`Провести "${d.doc_type}" из журнала не поддерживается`)
      }
      if (!r.ok) throw new Error(r.error ?? 'Ошибка проведения')
      await loadDocs()
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Ошибка проведения')
    } finally {
      setPostingId(null)
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

  const isOwnershipUnpost = cancelTarget?.doc_type === 'ownership'

  return (
    <div>
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

      {postError && (
        <p className="text-red-600 text-sm mb-3">{postError}</p>
      )}

      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Дата</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Контрагент</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Сумма</th>
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
                  <div className="flex items-center gap-2 justify-end">
                    {d.status === 'draft' && d.doc_type === 'ownership' && (
                      <button
                        className="text-zinc-400 hover:text-blue-600 transition-colors"
                        title="Открыть и редактировать"
                        onClick={() => openOwnershipDraft(d)}
                      >
                        <FileEdit size={14} />
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
                    <button
                      className={`transition-colors disabled:opacity-40 ${
                        d.status === 'posted'
                          ? 'text-green-500 hover:text-zinc-400'
                          : 'text-zinc-300 hover:text-green-500'
                      }`}
                      title={d.status === 'posted' ? 'Отменить проведение' : 'Провести'}
                      disabled={postingId === d.id}
                      onClick={() => {
                        if (d.status === 'posted') {
                          setCancelTarget(d); setCancelError(null)
                        } else {
                          handlePost(d)
                        }
                      }}
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  </div>
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

      <OwnershipDialog
        open={ownershipOpen}
        onClose={() => { setOwnershipOpen(false); setEditDocId(null) }}
        onPosted={() => { loadDocs(); loadPlots() }}
        preselectedPlot={null}
        allPlots={plots}
        editDocumentId={editDocId}
      />

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-zinc-200 p-6 max-w-sm w-full mx-4">
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
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-zinc-200 p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">
              {isOwnershipUnpost ? 'Отменить проведение?' : 'Отменить операцию?'}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              {isOwnershipUnpost
                ? 'Документ вернётся в черновик. Его можно будет открыть, изменить и провести снова.'
                : 'Операция будет сторнирована. Это действие нельзя отменить.'}
            </p>
            {cancelError && <p className="text-red-600 text-sm mb-3">{cancelError}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelError(null) }} disabled={cancelLoading}>
                Нет
              </Button>
              <Button variant="destructive" onClick={confirmCancel} disabled={cancelLoading}>
                {cancelLoading ? 'Отмена...' : isOwnershipUnpost ? 'Отменить проведение' : 'Отменить операцию'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
