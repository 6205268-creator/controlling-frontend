import { useEffect, useState } from 'react'
import { getOrgId } from '../lib/auth'
import {
  createContractor,
  createOwnership,
  updateOwnership,
  postOwnership,
  getOwnershipByDocumentId,
  type Contractor,
} from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ContractorPicker from './ContractorPicker'

export interface PlotOption {
  id: string
  number: string
  owner_name: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onPosted: () => void
  preselectedPlot: PlotOption | null
  allPlots: PlotOption[]
  /** documents.id из журнала — режим редактирования черновика */
  editDocumentId?: string | null
}

export default function OwnershipDialog({
  open, onClose, onPosted, preselectedPlot, allPlots, editDocumentId,
}: Props) {
  const orgId = getOrgId() ?? ''
  const isEdit = !!editDocumentId

  const [selectedPlot, setSelectedPlot] = useState<PlotOption | null>(null)
  const [contractorMode, setContractorMode] = useState<'search' | 'create'>('search')
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'individual' | 'legal_entity'>('individual')
  const [newPhone, setNewPhone] = useState('')
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [ownId, setOwnId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<'saved' | 'posted' | null>(null)

  useEffect(() => {
    if (!open) return
    if (editDocumentId) {
      loadExisting(editDocumentId)
    } else {
      setSelectedPlot(preselectedPlot)
      setOwnId(null)
    }
  }, [open, editDocumentId, preselectedPlot])

  async function loadExisting(documentId: string) {
    setLoading(true)
    setError(null)
    try {
      const line = await getOwnershipByDocumentId(documentId)
      if (!line) { setError('Документ не найден'); return }
      if (line.status !== 'draft') { setError('Документ уже проведён — откройте через отмену проведения'); return }

      setOwnId(line.id)
      setDocDate(line.doc_date)
      setNotes(line.notes ?? '')
      setSelectedContractor({
        id: line.contractor_id,
        full_name: line.contractor_name,
        contractor_type: 'individual',
        phone: null,
      })
      setContractorMode('search')

      const plot = allPlots.find(p => p.id === line.object_id)
      setSelectedPlot(plot ?? { id: line.object_id, number: '?', owner_name: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSelectedPlot(preselectedPlot)
    setContractorMode('search')
    setSelectedContractor(null)
    setNewName('')
    setNewType('individual')
    setNewPhone('')
    setDocDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setOwnId(null)
    setError(null)
    setSuccess(null)
    setLoading(false)
  }

  function handleClose() { reset(); onClose() }

  async function resolveContractorId(): Promise<string | null> {
    if (contractorMode === 'create') {
      if (!newName.trim()) { setError('Введите ФИО или название'); return null }
      const cr = await createContractor({ orgId, fullName: newName, contractorType: newType, phone: newPhone || undefined })
      if (!cr.ok) { setError(cr.error ?? 'Ошибка создания контрагента'); return null }
      return cr.contractor_id as string
    }
    if (!selectedContractor) { setError('Выберите владельца'); return null }
    return selectedContractor.id
  }

  async function persistDraft(contractorId: string): Promise<{ ok: boolean; ownId: string | null; error?: string }> {
    if (isEdit && ownId) {
      const r = await updateOwnership({
        ownId, contractorId, objectType: 'plot', objectId: selectedPlot!.id, docDate, notes: notes || undefined,
      })
      return { ok: r.ok, ownId, error: r.error }
    }
    const r = await createOwnership({
      orgId, contractorId, objectType: 'plot', objectId: selectedPlot!.id, docDate, notes: notes || undefined,
    })
    return { ok: r.ok, ownId: r.doc_id as string | null, error: r.error }
  }

  async function handleSave() {
    if (!selectedPlot) { setError('Выберите участок'); return }
    setSubmitting(true); setError(null)
    try {
      const contractorId = await resolveContractorId()
      if (!contractorId) { setSubmitting(false); return }
      const doc = await persistDraft(contractorId)
      if (!doc.ok) { setError(doc.error ?? 'Ошибка сохранения'); setSubmitting(false); return }
      setSuccess('saved')
      setTimeout(() => { reset(); onPosted(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePost() {
    if (!selectedPlot) { setError('Выберите участок'); return }
    setSubmitting(true); setError(null)
    try {
      const contractorId = await resolveContractorId()
      if (!contractorId) { setSubmitting(false); return }
      const doc = await persistDraft(contractorId)
      if (!doc.ok || !doc.ownId) { setError(doc.error ?? 'Ошибка сохранения'); setSubmitting(false); return }
      const posted = await postOwnership(doc.ownId)
      if (!posted.ok) { setError(posted.error ?? 'Ошибка проведения'); setSubmitting(false); return }
      setSuccess('posted')
      setTimeout(() => { reset(); onPosted(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isEdit ? 'Право владения' : 'Оформить право владения'}
          </h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
        </div>

        {loading && <p className="text-zinc-400 text-sm">Загрузка...</p>}

        {!loading && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Дата документа</label>
              <Input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className="w-44" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Участок</label>
              <select
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white text-zinc-900"
                value={selectedPlot?.id ?? ''}
                onChange={e => setSelectedPlot(allPlots.find(p => p.id === e.target.value) ?? null)}
              >
                <option value="">— выберите —</option>
                {allPlots.map(p => (
                  <option key={p.id} value={p.id}>
                    №{p.number}{p.owner_name ? ` (${p.owner_name})` : ''}
                  </option>
                ))}
              </select>
              {selectedPlot?.owner_name && (
                <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Участок уже закреплён за {selectedPlot.owner_name}. Продолжить — переоформить владение.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Владелец</label>

              {contractorMode === 'search' && (
                <div className="space-y-1.5">
                  <ContractorPicker
                    value={selectedContractor}
                    onChange={setSelectedContractor}
                    placeholder="Выберите или начните вводить ФИО..."
                  />
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setContractorMode('create')}
                  >
                    + Создать нового
                  </button>
                </div>
              )}

              {contractorMode === 'create' && (
                <div className="space-y-2 border border-zinc-200 rounded-md p-3">
                  <div className="flex gap-2">
                    {(['individual', 'legal_entity'] as const).map(type => (
                      <button
                        key={type}
                        className={`flex-1 text-sm py-1.5 rounded border transition-colors ${
                          newType === type
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                        }`}
                        onClick={() => setNewType(type)}
                      >
                        {type === 'individual' ? 'Физлицо' : 'Юрлицо'}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder={newType === 'individual' ? 'ФИО' : 'Название организации'}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                  <Input
                    placeholder="Телефон"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                  />
                  <button
                    className="text-sm text-zinc-400 hover:text-zinc-600"
                    onClick={() => setContractorMode('search')}
                  >
                    ← Найти существующего
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700">Заметки</label>
              <Input placeholder="Необязательно" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </>
        )}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        {success === 'saved' && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">Документ сохранён</p>
        )}
        {success === 'posted' && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">Документ проведён</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Отмена
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleSave} disabled={submitting || loading || !!success}>
              {submitting ? '...' : 'Сохранить'}
            </Button>
            <Button onClick={handlePost} disabled={submitting || loading || !!success}>
              {submitting ? '...' : 'Сохранить и провести'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
