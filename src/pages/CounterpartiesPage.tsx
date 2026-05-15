import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { User, Building2 } from 'lucide-react'
import PaymentDialog from '../components/PaymentDialog'

interface Counterparty {
  id: string
  full_name: string
  contractor_type: 'individual' | 'legal_entity'
  phone: string | null
  email: string | null
  is_active: boolean
}

interface Balance {
  contractor_id: string
  balance: number
}

interface CounterpartyRow extends Counterparty {
  balance: number
}

type TypeFilter = 'all' | 'individual' | 'legal_entity'

function fmtBalance(b: number): { text: string; cls: string } {
  if (b > 0) return { text: `+${b.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} BYN`, cls: 'text-green-600 font-semibold' }
  if (b < 0) return { text: `${b.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} BYN`, cls: 'text-red-600 font-semibold' }
  return { text: '0,00 BYN', cls: 'text-zinc-400' }
}

export default function CounterpartiesPage() {
  const [rows, setRows] = useState<CounterpartyRow[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; full_name: string } | null>(null)

  function load() {
    const q = orgParam()
    Promise.all([
      apiFetch<Counterparty[]>(`/contractors?${q}&order=full_name.asc`),
      apiFetch<Balance[]>(`/account_balances?${q}`),
    ]).then(([contractors, balances]) => {
      const bMap = new Map(balances.map(b => [b.contractor_id, b.balance]))
      setRows(contractors.map(c => ({ ...c, balance: bMap.get(c.id) ?? 0 })))
    }).catch(e => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (error) return <p className="text-red-600 text-sm">{error}</p>

  const filtered = rows
    .filter(r => typeFilter === 'all' || r.contractor_type === typeFilter)
    .filter(r => !search || r.full_name.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    all:          rows.length,
    individual:   rows.filter(r => r.contractor_type === 'individual').length,
    legal_entity: rows.filter(r => r.contractor_type === 'legal_entity').length,
  }

  const tabs: { key: TypeFilter; label: string }[] = [
    { key: 'all',          label: `Все (${counts.all})` },
    { key: 'individual',   label: `Физлица (${counts.individual})` },
    { key: 'legal_entity', label: `Юрлица (${counts.legal_entity})` },
  ]

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                typeFilter === t.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-500 hover:text-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-zinc-400">{filtered.length} записей</span>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Наименование</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Телефон</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Баланс</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const bal = fmtBalance(r.balance)
              return (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    <span className="flex items-center gap-2">
                      {r.contractor_type === 'individual'
                        ? <User size={14} className="text-zinc-400 shrink-0" />
                        : <Building2 size={14} className="text-zinc-400 shrink-0" />
                      }
                      {r.full_name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{r.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-600">{r.email ?? '—'}</td>
                  <td className={`px-5 py-3 ${bal.cls}`}>{bal.text}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {r.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Button size="sm" variant="outline"
                      onClick={() => setPaymentTarget({ id: r.id, full_name: r.full_name })}>
                      Принять платёж
                    </Button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-400">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentDialog
        open={paymentTarget !== null}
        onClose={() => setPaymentTarget(null)}
        onPosted={() => { setPaymentTarget(null); load() }}
        preselectedContractor={paymentTarget}
      />
    </div>
  )
}
