import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'
import { Input } from '@/components/ui/input'

interface Member {
  id: string
  contractor_id: string
  member_number: string
  joined_at: string
  is_active: boolean
}

interface Contractor {
  id: string
  full_name: string
  phone: string | null
}

interface MemberRow {
  id: string
  member_number: string
  full_name: string
  phone: string | null
  joined_at: string
  is_active: boolean
}

function fmtDate(d: string): string {
  return d.split('-').reverse().join('.')
}

export default function MembersPage() {
  const [rows, setRows] = useState<MemberRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = orgParam()
    Promise.all([
      apiFetch<Member[]>(`/members?${q}&order=member_number.asc`),
      apiFetch<Contractor[]>(`/contractors?${q}&select=id,full_name,phone`),
    ]).then(([members, contractors]) => {
      const cMap = new Map(contractors.map(c => [c.id, c]))
      setRows(members.map(m => {
        const c = cMap.get(m.contractor_id)
        return {
          id: m.id,
          member_number: m.member_number,
          full_name: c?.full_name ?? '—',
          phone: c?.phone ?? null,
          joined_at: m.joined_at,
          is_active: m.is_active,
        }
      }))
    }).finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || r.member_number.includes(search)
  )

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <Input
          placeholder="Поиск по ФИО или номеру члена..."
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
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">№ члена</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">ФИО</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Телефон</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Дата вступления</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 font-semibold text-zinc-900">{r.member_number}</td>
                <td className="px-5 py-3 text-zinc-700">{r.full_name}</td>
                <td className="px-5 py-3 text-zinc-600">{r.phone ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-600">{fmtDate(r.joined_at)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {r.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
