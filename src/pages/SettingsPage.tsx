import { useEffect, useState } from 'react'
import { getOrgSettings, setLockDate, type OrgSettings } from '../lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function fmtDate(iso: string | null): string {
  if (!iso) return 'не задана'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [lockInput, setLockInput] = useState('')
  const [lockSaving, setLockSaving] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [lockOk, setLockOk] = useState(false)

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
    setLockSaving(true)
    setLockError(null)
    setLockOk(false)
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

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>

  return (
    <div className="max-w-lg space-y-6">

      {/* Дата оперативного учёта — только чтение */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Дата и время актуальности оперативного учёта</h2>
        <p className="text-xs text-zinc-500 mb-2">
          Устанавливается автоматически при проведении и отмене документов.
        </p>
        <p className="text-2xl font-semibold text-zinc-800">
          {fmtDate(settings?.current_period ?? null)}
        </p>
      </div>

      {/* Дата запрета изменений */}
      <div className="bg-white rounded-lg border border-zinc-200 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Дата запрета изменений</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Документы до этой даты редактировать нельзя. Сейчас:{' '}
          <span className="font-medium text-zinc-700">{fmtDate(settings?.lock_date ?? null)}</span>
        </p>
        <div className="flex gap-3 items-center">
          <Input
            type="date"
            value={lockInput}
            onChange={e => { setLockInput(e.target.value); setLockOk(false) }}
            className="w-44"
          />
          <Button onClick={saveLock} disabled={lockSaving}>
            {lockSaving ? 'Установка...' : 'Установить'}
          </Button>
          {settings?.lock_date && (
            <Button
              variant="outline"
              disabled={lockSaving}
              onClick={async () => {
                setLockSaving(true)
                setLockError(null)
                setLockOk(false)
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
              }}
            >
              Снять
            </Button>
          )}
        </div>
        {lockError && <p className="text-red-600 text-xs mt-2">{lockError}</p>}
        {lockOk && <p className="text-green-600 text-xs mt-2">Установлено</p>}
      </div>

    </div>
  )
}
