import { useEffect, useRef, useState } from 'react'
import { getOrgId } from '../lib/auth'
import {
  createContractor,
  createOwnership,
  updateOwnership,
  postOwnership,
  getOwnershipOwners,
  addOwnershipOwner,
  updateOwnershipOwner,
  removeOwnershipOwner,
  type Contractor,
  type OwnershipLine,
} from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ContractorPicker from './ContractorPicker'
import { Plus, X } from 'lucide-react'

export interface PlotOption {
  id: string
  number: string
  owner_name: string | null
}

interface OwnerEntry {
  localId: string
  ownId: string | null
  contractor: Contractor | null
  shares: number
}

interface NewContractorPopup {
  ownerLocalId: string
  type: 'individual' | 'legal_entity'
  name: string
  phone: string
  creating: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onPosted: () => void
  preselectedPlot: PlotOption | null
  allPlots: PlotOption[]
  editDocumentId?: string | null
}

const OWNER_COLORS = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#15803d', '#166534']

function makeEntry(): OwnerEntry {
  return { localId: crypto.randomUUID(), ownId: null, contractor: null, shares: 1 }
}

function buildGradient(owners: OwnerEntry[]): string {
  const total = owners.reduce((s, o) => s + o.shares, 0)
  if (total === 0) return 'conic-gradient(#e5e7eb 0% 100%)'
  let pct = 0
  const parts = owners.map((o, i) => {
    const end = pct + (o.shares / total) * 100
    const color = o.contractor ? OWNER_COLORS[i % OWNER_COLORS.length] : '#d1d5db'
    const part = `${color} ${pct.toFixed(2)}% ${end.toFixed(2)}%`
    pct = end
    return part
  })
  return `conic-gradient(${parts.join(', ')})`
}

function abbrevName(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
  return name.slice(0, 14)
}

function lineToEntry(line: OwnershipLine): OwnerEntry {
  return {
    localId: crypto.randomUUID(),
    ownId: line.id,
    contractor: {
      id: line.contractor_id,
      full_name: line.contractor_name,
      contractor_type: 'individual',
      phone: null,
    },
    shares: line.shares,
  }
}

export default function OwnershipDialog({
  open, onClose, onPosted, preselectedPlot, allPlots, editDocumentId,
}: Props) {
  const orgId = getOrgId() ?? ''
  const isEdit = !!editDocumentId

  const [selectedPlot, setSelectedPlot] = useState<PlotOption | null>(null)
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [owners, setOwners] = useState<OwnerEntry[]>([makeEntry()])
  const [originalOwners, setOriginalOwners] = useState<OwnerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<'saved' | 'posted' | null>(null)
  const [popup, setPopup] = useState<NewContractorPopup | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    if (editDocumentId) {
      loadExisting(editDocumentId)
    } else {
      setSelectedPlot(preselectedPlot)
      setDocDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setOwners([makeEntry()])
      setOriginalOwners([])
      setError(null)
      setSuccess(null)
    }
  }, [open, editDocumentId, preselectedPlot])

  useEffect(() => {
    if (!popup) return
    function onMouseDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [popup])

  async function loadExisting(docId: string) {
    setLoading(true)
    setError(null)
    try {
      const lines = await getOwnershipOwners(docId)
      if (!lines.length) { setError('Документ не найден'); return }
      const first = lines[0]
      if (first.status !== 'draft') {
        setError('Документ уже проведён — откройте через отмену проведения')
        return
      }
      setDocDate(first.doc_date)
      setNotes(first.notes ?? '')
      const plot = allPlots.find(p => p.id === first.object_id)
      setSelectedPlot(plot ?? { id: first.object_id, number: '?', owner_name: null })
      const loaded = lines.map(lineToEntry)
      setOwners(loaded)
      setOriginalOwners(loaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    if (successTimerRef.current) { clearTimeout(successTimerRef.current); successTimerRef.current = null }
    setSelectedPlot(preselectedPlot)
    setDocDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setOwners([makeEntry()])
    setOriginalOwners([])
    setLoading(false)
    setSubmitting(false)
    setError(null)
    setSuccess(null)
    setPopup(null)
  }

  function handleClose() { reset(); onClose() }

  function updateOwner(localId: string, patch: Partial<OwnerEntry>) {
    setOwners(prev => prev.map(o => o.localId === localId ? { ...o, ...patch } : o))
  }

  function addOwnerRow() {
    setOwners(prev => [...prev, makeEntry()])
  }

  function removeOwnerRow(localId: string) {
    setOwners(prev => prev.filter(o => o.localId !== localId))
  }

  async function handleCreateContractor() {
    if (!popup) return
    if (!popup.name.trim()) { setError('Введите имя или название'); return }
    setPopup(p => p ? { ...p, creating: true } : null)
    setError(null)
    try {
      const cr = await createContractor({
        orgId,
        fullName: popup.name.trim(),
        contractorType: popup.type,
        phone: popup.phone.trim() || undefined,
      })
      if (!cr.ok) { setError(cr.error ?? 'Ошибка создания контрагента'); return }
      const contractor: Contractor = {
        id: cr.contractor_id as string,
        full_name: popup.name.trim(),
        contractor_type: popup.type,
        phone: popup.phone.trim() || null,
      }
      const ownerLocalId = popup.ownerLocalId
      setPopup(null)
      updateOwner(ownerLocalId, { contractor })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания')
    } finally {
      setPopup(p => p ? { ...p, creating: false } : null)
    }
  }

  async function applyOwnerDiff(docId: string) {
    const removed = originalOwners.filter(o => !owners.find(c => c.ownId === o.ownId))
    const added = owners.filter(o => !o.ownId && o.contractor !== null)
    const updated = owners.filter(o => {
      if (!o.ownId || !o.contractor) return false
      const orig = originalOwners.find(x => x.ownId === o.ownId)
      if (!orig) return false
      return orig.contractor?.id !== o.contractor.id || orig.shares !== o.shares
    })

    for (const o of removed) {
      const r = await removeOwnershipOwner(o.ownId!)
      if (!r.ok) throw new Error(r.error ?? 'Ошибка удаления владельца')
    }
    for (const o of added) {
      const r = await addOwnershipOwner({ documentId: docId, contractorId: o.contractor!.id, shares: o.shares })
      if (!r.ok) throw new Error(r.error ?? 'Ошибка добавления владельца')
    }
    for (const o of updated) {
      const r = await updateOwnershipOwner({ ownId: o.ownId!, contractorId: o.contractor!.id, shares: o.shares })
      if (!r.ok) throw new Error(r.error ?? 'Ошибка обновления владельца')
    }
  }

  async function persist(): Promise<string> {
    if (isEdit && editDocumentId) {
      const r = await updateOwnership({
        documentId: editDocumentId,
        objectType: 'plot',
        objectId: selectedPlot!.id,
        docDate,
        notes: notes || undefined,
      })
      if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
      await applyOwnerDiff(editDocumentId)
      return editDocumentId
    }
    const r = await createOwnership({
      orgId,
      objectType: 'plot',
      objectId: selectedPlot!.id,
      docDate,
      notes: notes || undefined,
    })
    if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
    const newDocId = r.doc_id as string
    for (const o of owners.filter(o => o.contractor !== null)) {
      const ar = await addOwnershipOwner({ documentId: newDocId, contractorId: o.contractor!.id, shares: o.shares })
      if (!ar.ok) throw new Error(ar.error ?? 'Ошибка добавления владельца')
    }
    return newDocId
  }

  async function handleSave() {
    if (!selectedPlot) { setError('Выберите участок'); return }
    if (!owners.some(o => o.contractor)) { setError('Добавьте хотя бы одного владельца'); return }
    setSubmitting(true)
    setError(null)
    try {
      await persist()
      setSuccess('saved')
      successTimerRef.current = setTimeout(() => { reset(); onPosted(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePost() {
    if (!selectedPlot) { setError('Выберите участок'); return }
    if (!owners.some(o => o.contractor)) { setError('Добавьте хотя бы одного владельца'); return }
    setSubmitting(true)
    setError(null)
    try {
      const docId = await persist()
      const posted = await postOwnership(docId)
      if (!posted.ok) throw new Error(posted.error ?? 'Ошибка проведения')
      setSuccess('posted')
      successTimerRef.current = setTimeout(() => { reset(); onPosted(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  const totalShares = owners.reduce((s, o) => s + o.shares, 0)
  const hasContractor = owners.some(o => o.contractor !== null)
  const gradient = buildGradient(owners)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: 'var(--theme-gradient-header)' }}
        >
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Право владения' : 'Оформить право владения'}
          </h2>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <p className="px-6 py-8 text-sm text-zinc-400">Загрузка...</p>
        ) : (
          <div className="flex flex-1 overflow-auto min-h-0">
            {/* Left column — form */}
            <div className="flex-1 p-6 space-y-4 border-r border-zinc-100 overflow-auto">
              {/* Date + Plot */}
              <div className="flex gap-4">
                <div className="space-y-1 shrink-0">
                  <label className="text-xs font-medium text-zinc-500">Дата</label>
                  <Input
                    type="date"
                    value={docDate}
                    onChange={e => setDocDate(e.target.value)}
                    className="w-36 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Участок</label>
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
                </div>
              </div>

              {selectedPlot?.owner_name && (
                <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Участок уже закреплён за {selectedPlot.owner_name}. Продолжить — переоформить владение.
                </p>
              )}

              {/* Owners */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Владельцы</p>

                {owners.map((owner) => {
                  const ownerPct = totalShares > 0 ? Math.round((owner.shares / totalShares) * 100) : 0
                  const isPopupOpen = popup?.ownerLocalId === owner.localId

                  return (
                    <div key={owner.localId} className="border border-zinc-200 rounded-lg p-3 space-y-2 relative">
                      {/* Picker row */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <ContractorPicker
                            value={owner.contractor}
                            onChange={c => updateOwner(owner.localId, { contractor: c })}
                            placeholder="Выберите или введите ФИО..."
                          />
                        </div>
                        <button
                          type="button"
                          title="Создать нового контрагента"
                          onClick={() =>
                            setPopup(isPopupOpen
                              ? null
                              : { ownerLocalId: owner.localId, type: 'individual', name: '', phone: '', creating: false }
                            )
                          }
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border transition-all"
                          style={isPopupOpen
                            ? { background: 'var(--theme-gradient-header)', borderColor: 'transparent', color: 'white' }
                            : { borderColor: '#e4e4e7', color: '#71717a' }
                          }
                        >
                          <Plus size={14} />
                        </button>
                        {owners.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOwnerRow(owner.localId)}
                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-300 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Shares row */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 shrink-0">Долей:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={owner.shares}
                          onChange={e => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v) && v >= 1 && v <= 9) updateOwner(owner.localId, { shares: v })
                          }}
                          className="w-10 text-center text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-1"
                          style={{ borderColor: 'var(--theme-accent)', '--tw-ring-color': 'var(--theme-accent)' } as React.CSSProperties}
                        />
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{ width: `${ownerPct}%`, background: 'var(--theme-accent)' }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium shrink-0 w-8 text-right"
                          style={{ color: 'var(--theme-accent)' }}
                        >
                          {ownerPct}%
                        </span>
                      </div>

                      {/* Mini-popup */}
                      {isPopupOpen && (
                        <div
                          ref={popupRef}
                          className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-zinc-200 w-72 overflow-hidden"
                        >
                          <div
                            className="px-4 py-3 text-sm font-semibold text-white"
                            style={{ background: 'var(--theme-gradient-header)' }}
                          >
                            Новый контрагент
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              {(['individual', 'legal_entity'] as const).map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setPopup(p => p ? { ...p, type: t } : null)}
                                  className="h-14 flex flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-all"
                                  style={popup?.type === t
                                    ? {
                                        background: t === 'individual'
                                          ? 'var(--theme-gradient-individual)'
                                          : 'var(--theme-gradient-entity)',
                                        color: 'white',
                                        borderColor: 'transparent',
                                      }
                                    : { borderColor: '#e4e4e7', color: '#71717a' }
                                  }
                                >
                                  <span className="text-lg leading-none">
                                    {t === 'individual' ? '🧑' : '🏢'}
                                  </span>
                                  {t === 'individual' ? 'Физлицо' : 'Юрлицо'}
                                </button>
                              ))}
                            </div>
                            <Input
                              placeholder={popup?.type === 'individual' ? 'ФИО' : 'Название организации'}
                              value={popup?.name ?? ''}
                              onChange={e => setPopup(p => p ? { ...p, name: e.target.value } : null)}
                              className="text-sm"
                            />
                            <Input
                              placeholder="+375 (__) ___-__-__"
                              value={popup?.phone ?? ''}
                              onChange={e => setPopup(p => p ? { ...p, phone: e.target.value } : null)}
                              className="text-sm"
                            />
                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setPopup(null)}
                              >
                                Отмена
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={handleCreateContractor}
                                disabled={popup?.creating}
                              >
                                {popup?.creating ? '...' : 'Создать'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={addOwnerRow}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--theme-accent)' }}
                >
                  + Добавить ещё владельца
                </button>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Заметки</label>
                <Input
                  placeholder="Необязательно"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Right column — donut */}
            <div className="w-52 shrink-0 p-6 flex flex-col items-center gap-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide self-start">Доли</p>

              {/* Donut chart */}
              <div
                className="w-32 h-32 rounded-full shrink-0"
                style={{
                  background: gradient,
                  mask: 'radial-gradient(circle at center, transparent 42%, black 42%)',
                  WebkitMask: 'radial-gradient(circle at center, transparent 42%, black 42%)',
                }}
              />

              {/* Legend */}
              <div className="w-full space-y-1.5">
                {owners.map((o, i) => {
                  const pct = totalShares > 0 ? Math.round((o.shares / totalShares) * 100) : 0
                  const color = o.contractor ? OWNER_COLORS[i % OWNER_COLORS.length] : '#d1d5db'
                  const label = o.contractor ? abbrevName(o.contractor.full_name) : 'Не выбран'
                  return (
                    <div key={o.localId} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-xs text-zinc-600 flex-1 truncate">{label}</span>
                      <span className="text-xs font-medium shrink-0" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-zinc-400 self-start">
                Всего долей: {totalShares}
              </p>
            </div>
          </div>
        )}

        {/* Error / success */}
        {(error || success) && (
          <div className="px-6 pb-2 shrink-0">
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}
            {success === 'saved' && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">Документ сохранён</p>
            )}
            {success === 'posted' && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">Документ проведён</p>
            )}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="flex gap-2 px-6 py-4 border-t border-zinc-100 shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Отмена
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={submitting || !selectedPlot || !hasContractor || !!success}
              >
                {submitting ? '...' : 'Сохранить'}
              </Button>
              <Button
                onClick={handlePost}
                disabled={submitting || !selectedPlot || !hasContractor || !!success}
              >
                {submitting ? '...' : 'Провести'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
