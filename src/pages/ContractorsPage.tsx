import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'
import { Input } from '@/components/ui/input'

interface Contractor {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  is_active: boolean
}

interface Balance {
  contractor_id: string
  balance: number
}

interface ContractorRow extends Contractor {
  balance: number
}

function fmtBalance(b: number): { text: string; cls: string } {
  if (b > 0) return { text: `+${b.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} BYN`, cls: 'text-green-600 font-semibold' }
  if (b < 0) return { text: `${b.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} BYN`, cls: 'text-red-600 font-semibold' }
  return { text: '0,00 BYN', cls: 'text-zinc-400' }
}

export default function ContractorsPage() {
  const [rows, setRows] = useState<ContractorRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = orgParam()
    Promise.all([
      apiFetch<Contractor[]>(`/contractors?${q}&order=full_name.asc`),
      apiFetch<Balance[]>(`/account_balances?${q}`),
    ]).then(([contractors, balances]) => {
      const bMap = new Map(balances.map(b => [b.contractor_id, b.balance]))
      setRows(contractors.map(c => ({ ...c, balance: bMap.get(c.id) ?? 0 })))
    }).finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <Input
          placeholder="Поиск по ФИО..."
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
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">ФИО</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Телефон</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Email</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Баланс</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const bal = fmtBalance(r.balance)
              return (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                  <td className="px-5 py-3 font-medium text-zinc-900">{r.full_name}</td>
                  <td className="px-5 py-3 text-zinc-600">{r.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-600">{r.email ?? '—'}</td>
                  <td className={`px-5 py-3 ${bal.cls}`}>{bal.text}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {r.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
