import { useEffect, useState } from 'react'
import { Droplets, Zap, Flame } from 'lucide-react'
import { getOrgSettings, setLockDate, setMeterTypes, type OrgSettings } from '../lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const METER_TYPES = [
  { key: 'water',       label: 'Вода',          Icon: Droplets, on: 'bg-blue-700 border-blue-700 shadow-blue-300'    },
  { key: 'electricity', label: 'Электричество',  Icon: Zap,      on: 'bg-red-500 border-red-500 shadow-red-200'       },
  { key: 'gas',         label: 'Газ',            Icon: Flame,    on: 'bg-sky-400 border-sky-400 shadow-sky-200'       },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [lockInput, setLockInput] = useState('')
  const [lockSaving, setLockSaving] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [lockOk, setLockOk] = useState(false)

  const [meterTypes, setMeterTypesState] = useState<Record<string, boolean>>({
    water: true, electricity: true, gas: true,
  })
  const [meterSaving, setMeterSaving] = useState(false)
  const [meterError, setMeterError] = useState<string | null>(null)
  const [meterOk, setMeterOk] = useState(false)

  async function load() {
    try {
      const s = await getOrgSettings()
      setSettings(s)
      setLockInput(s?.lock_date ?? '')
      if (s?.enabled_meter_types) {
        setMeterTypesState({
          water:       s.enabled_meter_types.includes('water'),
          electricity: s.enabled_meter_types.includes('electricity'),
          gas:         s.enabled_meter_types.includes('gas'),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function saveLock() {
    setLockSaving(true); setLockError(null); setLockOk(false)
    try {
      await setLockDate(lockInput || null)
      setLockOk(true)
      await load()
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLockSaving(false)
    }
  }

  async function clearLock() {
    setLockSaving(true); setLockError(null); setLockOk(false)
    try {
      await setLockDate(null)
      setLockInput('')
      setLockOk(true)
      await load()
    } catch (e) {
      setLockError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLockSaving(false)
    }
  }

  async function saveMeterTypes() {
    const selected = Object.entries(meterTypes).filter(([, v]) => v).map(([k]) => k)
    if (selected.length === 0) { setMeterError('Выберите хотя бы один тип'); return }
    setMeterSaving(true); setMeterError(null); setMeterOk(false)
    try {
      await setMeterTypes(selected)
      setMeterOk(true)
    } catch (e) {
      setMeterError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setMeterSaving(false)
    }
  }

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>
  if (error)   return <p className="text-red-600 text-sm">{error}</p>

  return (
    <div className="max-w-xl space-y-5">

      {/* ── Учётный период ── */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-5">
          Учётный период
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Текущий период — только отображение */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Дата актуальности</p>
            <p className="text-2xl font-bold text-zinc-800 tabular-nums tracking-tight">
              {fmtDate(settings?.current_period ?? null)}
            </p>
            <p className="text-xs text-zinc-400 mt-1">устанавливается автоматически</p>
          </div>

          {/* Дата запрета */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Запрет изменений</p>
            {settings?.lock_date ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg px-3 py-1.5 tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {fmtDate(settings.lock_date)}
                </span>
                <button
                  className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors"
                  onClick={clearLock}
                  disabled={lockSaving}
                >
                  снять
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 mb-2">не задана</p>
            )}
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={lockInput}
                onChange={e => { setLockInput(e.target.value); setLockOk(false) }}
                className="w-36 text-sm"
              />
              <Button onClick={saveLock} disabled={lockSaving} size="sm">
                {lockSaving ? '…' : 'Установить'}
              </Button>
            </div>
            {lockError && <p className="text-red-500 text-xs mt-1.5">{lockError}</p>}
            {lockOk    && <p className="text-green-600 text-xs mt-1.5">Сохранено ✓</p>}
          </div>
        </div>
      </div>

      {/* ── Типы счётчиков ── */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
          Типы счётчиков
        </p>
        <p className="text-xs text-zinc-400 mb-5">
          Только выбранные типы доступны при добавлении счётчика.
        </p>

        <div className="flex gap-3 mb-5">
          {METER_TYPES.map(({ key, label, Icon, on: onClass }) => {
            const active = meterTypes[key]
            return (
              <button
                key={key}
                onClick={() => { setMeterTypesState(t => ({ ...t, [key]: !t[key] })); setMeterOk(false) }}
                className={`relative flex flex-col items-center justify-center gap-1.5 w-28 h-16 rounded-lg border-2 transition-all duration-200 select-none cursor-pointer ${
                  active
                    ? `${onClass} text-white shadow-lg`
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {active && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-white/70" />
                )}
                <Icon
                  size={16}
                  className={active ? 'text-white' : 'text-zinc-300'}
                />
                <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-400'}`}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveMeterTypes} disabled={meterSaving}>
            {meterSaving ? '…' : 'Сохранить'}
          </Button>
          {meterError && <p className="text-red-500 text-xs">{meterError}</p>}
          {meterOk    && <p className="text-green-600 text-xs">Сохранено ✓</p>}
        </div>
      </div>

    </div>
  )
}
