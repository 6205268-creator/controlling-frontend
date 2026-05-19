import { useEffect, useState } from 'react'
import { getOrgId } from '../lib/auth'
import {
  createContractor,
  createOwnership,
  postOwnership,
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
}

export default function OwnershipDialog({ open, onClose, onPosted, preselectedPlot, allPlots }: Props) {
  const orgId = getOrgId() ?? ''

  const [selectedPlot, setSelectedPlot] = useState<PlotOption | null>(null)
  const [contractorMode, setContractorMode] = useState<'search' | 'create'>('search')
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'individual' | 'legal_entity'>('individual')
  const [newPhone, setNewPhone] = useState('')
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  useEffect(() => {
    if (open) setSelectedPlot(preselectedPlot)
  }, [open, preselectedPlot])

  function reset() {
    setSelectedPlot(preselectedPlot)
    setContractorMode('search')
    setSelectedContractor(null)
    setNewName('')
    setNewType('individual')
    setNewPhone('')
    setDocDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setError(null)
    setSuccess(false)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit() {
    if (!selectedPlot) { setError('Выберите участок'); return }
    setSubmitting(true)
    setError(null)
    try {
      let contractorId: string | null = selectedContractor?.id ?? null

      if (contractorMode === 'create') {
        if (!newName.trim()) { setError('Введите ФИО или название'); setSubmitting(false); return }
        const cr = await createContractor({ orgId, fullName: newName, contractorType: newType, phone: newPhone || undefined })
        if (!cr.ok) { setError(cr.error ?? 'Ошибка создания контрагента'); setSubmitting(false); return }
        contractorId = cr.contractor_id as string
      }

      if (!contractorId) { setError('Выберите или создайте владельца'); setSubmitting(false); return }

      const doc = await createOwnership({
        orgId, contractorId, objectType: 'plot', objectId: selectedPlot.id, docDate, notes: notes || undefined,
      })
      if (!doc.ok) { setError(doc.error ?? 'Ошибка создания документа'); setSubmitting(false); return }

      const posted = await postOwnership(doc.doc_id as string)
      if (!posted.ok) { setError(posted.error ?? 'Ошибка проведения'); setSubmitting(false); return }

      setSuccess(true)
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
          <h2 className="text-lg font-semibold text-zinc-900">Оформить право владения</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
        </div>

        {/* Блок 1 — Участок */}
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

        {/* Блок 2 — Владелец */}
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

        {/* Блок 3 — Дата и заметки */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Дата документа</label>
            <Input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Заметки</label>
            <Input placeholder="Необязательно" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">
            Право владения оформлено
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={submitting || success}>
            {submitting ? 'Проводим...' : 'Провести документ'}
          </Button>
        </div>
      </div>
    </div>
  )
}
