import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Droplets, Zap, Flame, Check } from 'lucide-react'
import { getOrgSettings, setLockDate, type OrgSettings } from '../lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function fmtDate(iso: string | null): string {
  if (!iso) return 'не задана'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const METER_TYPES = [
  { key: 'water',       label: 'Вода',          Icon: Droplets, color: 'text-blue-500' },
  { key: 'electricity', label: 'Электричество',  Icon: Zap,      color: 'text-yellow-500' },
  { key: 'gas',         label: 'Газ',            Icon: Flame,    color: 'text-orange-500' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [lockInput, setLockInput] = useState('')
  const [lockSaving, setLockSaving] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [lockOk, setLockOk] = useState(false)

  const [meterTypes, setMeterTypes] = useState<Record<string, boolean>>({
    water: true, electricity: true, gas: true,
  })

  async function load() {
    try {
      const s = await getOrgSettings()
      setSettings(s)
      setLockInput(s?.lock_date ?? '')
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

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>

  return (
    <div className="max-w-2xl space-y-5">

      {/* Блок дат — горизонтально */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-4">Учётный период</h2>
        <div className="flex gap-8 items-start flex-wrap">

          {/* Дата актуальности */}
          <div className="min-w-[180px]">
            <p className="text-xs text-zinc-500 mb-1">Дата актуальности учёта</p>
            <p className="text-xl font-semibold text-zinc-800">{fmtDate(settings?.current_period ?? null)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">устанавливается автоматически</p>
          </div>

          <div className="w-px self-stretch bg-zinc-100" />

          {/* Дата запрета */}
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs text-zinc-500 mb-1">Дата запрета изменений</p>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={lockInput}
                onChange={e => { setLockInput(e.target.value); setLockOk(false) }}
                className="w-40"
              />
              <Button onClick={saveLock} disabled={lockSaving} size="sm">
                {lockSaving ? '...' : 'Установить'}
              </Button>
              {settings?.lock_date && (
                <Button variant="outline" size="sm" disabled={lockSaving} onClick={clearLock}>
                  Снять
                </Button>
              )}
            </div>
            {lockError && <p className="text-red-600 text-xs mt-1">{lockError}</p>}
            {lockOk && <p className="text-green-600 text-xs mt-1">Установлено</p>}
          </div>

        </div>
      </div>

      {/* Блок типов счётчиков */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Типы счётчиков</h2>
          <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">В разработке</span>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Выберите типы, которые используются в учёте. Только они будут доступны при создании счётчика.
        </p>

        <div className="flex gap-2 flex-wrap mb-4">
          {METER_TYPES.map(({ key, label, Icon, color }) => (
            <label key={key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer select-none text-sm transition-colors ${
                meterTypes[key]
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'
              }`}>
              <input
                type="checkbox"
                checked={meterTypes[key]}
                onChange={e => setMeterTypes(t => ({ ...t, [key]: e.target.checked }))}
                className="sr-only"
              />
              {meterTypes[key] && <Check size={13} className="text-blue-600 shrink-0" />}
              <Icon size={14} className={meterTypes[key] ? 'text-blue-600' : color} />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </div>

        <Button
          size="sm"
          onClick={() => toast.info('Функция недоступна', { description: 'Настройка типов счётчиков появится после обновления сервера.' })}
        >
          Сохранить
        </Button>
      </div>

    </div>
  )
}
