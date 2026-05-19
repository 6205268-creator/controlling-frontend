import { useEffect, useState } from 'react'
import { apiFetch, orgParam, getPlotsByOwner, addMeter, updateMeter, getOrgSettings, type Contractor, type PlotSummary } from '../lib/api'
import { getOrgId } from '../lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import ContractorPicker from '../components/ContractorPicker'

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

interface EditTarget { id: string; meter_type: string; serial_number: string; is_active: boolean }

const TYPE_LABELS: Record<string, string> = {
  water:       'Вода',
  electricity: 'Электричество',
  gas:         'Газ',
}

type TypeFilter = 'all' | 'water' | 'electricity' | 'gas'

export default function MetersPage() {
  const [rows, setRows] = useState<MeterRow[]>([])
  const [filter, setFilter] = useState<TypeFilter>('all')
  const [loading, setLoading] = useState(true)
  const [enabledTypes, setEnabledTypes] = useState<string[]>(['water', 'electricity', 'gas'])

  // --- Add meter state ---
  const [addOpen, setAddOpen] = useState(false)
  const [addOwner, setAddOwner] = useState<Contractor | null>(null)
  const [addPlots, setAddPlots] = useState<PlotSummary[]>([])
  const [addPlotId, setAddPlotId] = useState('')
  const [addType, setAddType] = useState(() => enabledTypes[0] ?? 'water')
  const [addSerial, setAddSerial] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)
  const [addPlotsLoading, setAddPlotsLoading] = useState(false)

  // --- Edit meter state ---
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [editForm, setEditForm] = useState({ meter_type: 'water', serial_number: '', is_active: true })
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  function loadMeters() {
    const q = orgParam()
    Promise.all([
      apiFetch<Meter[]>(`/meters?${q}&order=serial_number.asc`),
      apiFetch<Plot[]>(`/plots?${q}&select=id,number`),
      getOrgSettings(),
    ]).then(([meters, plots, settings]) => {
      if (settings?.enabled_meter_types?.length) {
        setEnabledTypes(settings.enabled_meter_types)
      }
      const pMap = new Map(plots.map(p => [p.id, p.number]))
      setRows(meters.map(m => ({
        id: m.id,
        meter_type: m.meter_type,
        serial_number: m.serial_number,
        plot_number: m.plot_id ? (pMap.get(m.plot_id) ?? null) : null,
        is_active: m.is_active,
      })))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadMeters() }, [])

  // --- Add meter handlers ---
  async function selectOwner(c: Contractor | null) {
    setAddOwner(c)
    setAddPlots([])
    setAddPlotId('')
    setAddError(null)
    if (!c) return
    setAddPlotsLoading(true)
    try {
      const plots = await getPlotsByOwner(c.id)
      setAddPlots(plots)
      if (plots.length === 0) {
        setAddError('У этого контрагента нет участков')
      } else if (plots.length === 1) {
        setAddPlotId(plots[0].id)
      }
    } finally {
      setAddPlotsLoading(false)
    }
  }

  function resetAddForm() {
    setAddOwner(null); setAddPlots([]); setAddPlotId('')
    setAddType(enabledTypes[0] ?? 'water'); setAddSerial(''); setAddError(null)
  }

  async function saveAdd() {
    if (!addOwner || !addPlotId || !addSerial.trim()) {
      setAddError('Заполните все поля')
      return
    }
    setAddSaving(true)
    setAddError(null)
    try {
      await addMeter({ orgId: getOrgId() ?? '', plotId: addPlotId, meterType: addType, serialNumber: addSerial.trim() })
      setAddOpen(false)
      resetAddForm()
      loadMeters()
    } catch {
      setAddError('Ошибка сохранения')
    } finally {
      setAddSaving(false)
    }
  }

  // --- Edit meter handlers ---
  function openEdit(r: MeterRow) {
    setEditTarget({ id: r.id, meter_type: r.meter_type, serial_number: r.serial_number, is_active: r.is_active })
    setEditForm({ meter_type: r.meter_type, serial_number: r.serial_number, is_active: r.is_active })
    setEditError(null)
  }

  async function saveEdit() {
    if (!editTarget || !editForm.serial_number.trim()) {
      setEditError('Серийный номер обязателен')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      await updateMeter(editTarget.id, { meter_type: editForm.meter_type, serial_number: editForm.serial_number.trim(), is_active: editForm.is_active })
      setEditTarget(null)
      loadMeters()
    } catch {
      setEditError('Ошибка сохранения')
    } finally {
      setEditSaving(false)
    }
  }

  const filtered = rows.filter(r => filter === 'all' || r.meter_type === filter)

  const counts = {
    all:         rows.length,
    water:       rows.filter(r => r.meter_type === 'water').length,
    electricity: rows.filter(r => r.meter_type === 'electricity').length,
    gas:         rows.filter(r => r.meter_type === 'gas').length,
  }

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: `Все (${counts.all})` },
    ...(['water', 'electricity', 'gas'] as const)
      .filter(t => enabledTypes.includes(t))
      .map(t => ({ key: t as TypeFilter, label: `${TYPE_LABELS[t]} (${counts[t]})` })),
  ]

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                filter === t.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <Button className="ml-auto" onClick={() => { resetAddForm(); setAddOpen(true) }}>
          + Добавить счётчик
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Серийный номер</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Участок</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
              <th className="px-5 py-2.5"></th>
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
                <td className="px-5 py-3 text-right">
                  <button className="text-zinc-400 hover:text-zinc-700 transition-colors" title="Редактировать"
                    onClick={() => openEdit(r)}>
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Счётчиков нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add meter dialog */}
      <Dialog open={addOpen} onOpenChange={open => { if (!open) { setAddOpen(false); resetAddForm() } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить счётчик</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Owner picker */}
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Владелец</label>
              <ContractorPicker value={addOwner} onChange={selectOwner} placeholder="Выберите или начните вводить ФИО..." />
            </div>

            {/* Plot selection */}
            {addPlotsLoading && <p className="text-sm text-zinc-400">Загрузка участков...</p>}
            {addOwner && !addPlotsLoading && addPlots.length > 1 && (
              <div>
                <label className="text-sm text-zinc-600 block mb-1">Участок</label>
                <select className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
                  value={addPlotId} onChange={e => setAddPlotId(e.target.value)}>
                  <option value="">Выберите участок</option>
                  {addPlots.map(p => <option key={p.id} value={p.id}>Участок {p.number}</option>)}
                </select>
              </div>
            )}
            {addOwner && !addPlotsLoading && addPlots.length === 1 && (
              <p className="text-sm text-zinc-600">Участок: <strong>№{addPlots[0].number}</strong> (подставлен автоматически)</p>
            )}

            {/* Meter type */}
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Тип счётчика</label>
              <select className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
                value={addType} onChange={e => setAddType(e.target.value)}>
                {enabledTypes.includes('water')       && <option value="water">Вода</option>}
                {enabledTypes.includes('electricity') && <option value="electricity">Электричество</option>}
                {enabledTypes.includes('gas')         && <option value="gas">Газ</option>}
              </select>
            </div>

            {/* Serial number */}
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Серийный номер</label>
              <Input value={addSerial} onChange={e => setAddSerial(e.target.value)} placeholder="Например: А123456789" />
            </div>

            {addError && <p className="text-red-600 text-sm">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetAddForm() }}>Отмена</Button>
            <Button onClick={saveAdd} disabled={addSaving || !addOwner || !addPlotId}>
              {addSaving ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit meter dialog */}
      <Dialog open={editTarget !== null} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать счётчик</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Тип счётчика</label>
              <select className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
                value={editForm.meter_type} onChange={e => setEditForm(f => ({ ...f, meter_type: e.target.value }))}>
                <option value="water">Вода</option>
                <option value="electricity">Электричество</option>
                <option value="gas">Газ</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Серийный номер</label>
              <Input value={editForm.serial_number}
                onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="meter-active" checked={editForm.is_active}
                onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4" />
              <label htmlFor="meter-active" className="text-sm text-zinc-600">Счётчик активен</label>
            </div>
            {editError && <p className="text-red-600 text-sm">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Отмена</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
