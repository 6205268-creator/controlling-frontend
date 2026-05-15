import { useEffect, useState } from 'react'
import { apiFetch, orgParam, updatePlot } from '../lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import OwnershipDialog, { type PlotOption } from '../components/OwnershipDialog'

interface PlotSummary {
  id: string
  number: string
  area: number
  is_active: boolean
  owner_id: string | null
  owner_name: string | null
  owner_phone: string | null
}

type FilterTab = 'all' | 'active' | 'inactive'

export default function PlotsPage() {
  const [plots, setPlots] = useState<PlotSummary[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preselectedPlot, setPreselectedPlot] = useState<PlotOption | null>(null)
  const [editTarget, setEditTarget] = useState<PlotSummary | null>(null)
  const [editForm, setEditForm] = useState({ number: '', area: '', is_active: true })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function openEdit(p: PlotSummary) {
    setEditTarget(p)
    setEditForm({ number: p.number, area: String(p.area), is_active: p.is_active })
    setEditError(null)
  }

  async function saveEdit() {
    if (!editTarget) return
    const area = parseFloat(editForm.area)
    if (!editForm.number.trim() || isNaN(area) || area <= 0) {
      setEditError('Заполните все поля корректно')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      await updatePlot(editTarget.id, { number: editForm.number.trim(), area, is_active: editForm.is_active })
      setEditTarget(null)
      loadPlots()
    } catch {
      setEditError('Ошибка сохранения')
    } finally {
      setEditSaving(false)
    }
  }

  function loadPlots() {
    setLoading(true)
    apiFetch<PlotSummary[]>(`/plot_summary?${orgParam()}`)
      .then(data => setPlots([...data].sort((a, b) => parseInt(a.number) - parseInt(b.number))))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPlots() }, [])

  function openForAll() { setPreselectedPlot(null); setDialogOpen(true) }
  function openForPlot(p: PlotSummary) {
    setPreselectedPlot({ id: p.id, number: p.number, owner_name: p.owner_name })
    setDialogOpen(true)
  }

  const filtered = plots
    .filter(p => tab === 'all' ? true : tab === 'active' ? p.is_active : !p.is_active)
    .filter(p => !search || (p.owner_name ?? '').toLowerCase().includes(search.toLowerCase()) || p.number.includes(search))

  const counts = {
    all: plots.length,
    active: plots.filter(p => p.is_active).length,
    inactive: plots.filter(p => !p.is_active).length,
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: `Все (${counts.all})` },
    { key: 'active',   label: `Активные (${counts.active})` },
    { key: 'inactive', label: `Неактивные (${counts.inactive})` },
  ]

  const allPlots: PlotOption[] = plots.map(p => ({ id: p.id, number: p.number, owner_name: p.owner_name }))

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                tab === t.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Поиск по владельцу или номеру..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openForAll} className="ml-auto">
          + Оформить владение
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">№</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Площадь</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Владелец</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 font-semibold text-zinc-900">{p.number}</td>
                <td className="px-5 py-3 text-zinc-600">{p.area.toFixed(2)} сот.</td>
                <td className="px-5 py-3 text-zinc-700">{p.owner_name ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {p.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right flex items-center justify-end gap-3">
                  {!p.owner_id && (
                    <button
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      onClick={() => openForPlot(p)}
                    >
                      Назначить владельца
                    </button>
                  )}
                  <button
                    className="text-zinc-400 hover:text-zinc-700 transition-colors"
                    title="Редактировать"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Ничего не найдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editTarget !== null} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать участок</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Номер участка</label>
              <Input
                value={editForm.number}
                onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))}
                placeholder="Например: 5"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-600 block mb-1">Площадь (сотки)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editForm.area}
                onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))}
                placeholder="Например: 6.05"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="plot-active"
                checked={editForm.is_active}
                onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="plot-active" className="text-sm text-zinc-600">Участок активен</label>
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

      <OwnershipDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPosted={loadPlots}
        preselectedPlot={preselectedPlot}
        allPlots={allPlots}
      />
    </div>
  )
}
