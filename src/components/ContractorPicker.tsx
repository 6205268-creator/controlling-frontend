import { useEffect, useRef, useState } from 'react'
import { apiFetch, orgParam, type Contractor } from '../lib/api'
import { Input } from '@/components/ui/input'
import { List } from 'lucide-react'

interface Props {
  value: Contractor | null
  onChange: (c: Contractor | null) => void
  placeholder?: string
}

export default function ContractorPicker({ value, onChange, placeholder = 'Начните вводить ФИО...' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  async function loadAll() {
    if (all.length > 0) return
    setLoading(true)
    try {
      const data = await apiFetch<Contractor[]>(
        `/contractors?${orgParam()}&select=id,full_name,contractor_type,phone&order=full_name.asc`
      )
      setAll(data)
    } finally {
      setLoading(false)
    }
  }

  function handleType(q: string) {
    setQuery(q)
    if (q.trim().length > 0) {
      setOpen(true)
      loadAll()
    } else {
      setOpen(false)
    }
  }

  function handleListButton() {
    if (open) { setOpen(false); return }
    loadAll()
    setOpen(true)
  }

  const filtered = query.trim()
    ? all.filter(c =>
        c.full_name.toLowerCase().includes(query.toLowerCase()) ||
        (c.phone ?? '').includes(query)
      )
    : all

  if (value) {
    return (
      <div className="flex items-center gap-2 border border-zinc-200 rounded-md px-3 py-2 bg-zinc-50">
        <span className="text-sm text-zinc-900 flex-1">{value.full_name}</span>
        <button
          className="text-zinc-400 hover:text-zinc-600 text-xs"
          onClick={() => { onChange(null); setQuery('') }}
        >✕</button>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border border-zinc-200 rounded-md focus-within:ring-1 focus-within:ring-zinc-400 bg-white">
        <Input
          value={query}
          onChange={e => handleType(e.target.value)}
          placeholder={placeholder}
          className="border-0 shadow-none focus-visible:ring-0 flex-1"
        />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); handleListButton() }}
          className={`px-2.5 text-zinc-400 hover:text-zinc-700 transition-colors border-l border-zinc-200 self-stretch flex items-center ${open && !query ? 'text-zinc-700' : ''}`}
          title="Выбрать из списка"
        >
          <List size={15} />
        </button>
      </div>
      {open && (
        <div className="absolute z-10 w-full bg-white border border-zinc-200 rounded-md shadow-md mt-1 max-h-52 overflow-y-auto">
          {loading && <p className="px-3 py-2.5 text-sm text-zinc-400">Загрузка...</p>}
          {!loading && filtered.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-zinc-400">Ничего не найдено</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 flex items-center gap-2"
              onMouseDown={e => { e.preventDefault(); onChange(c); setOpen(false); setQuery('') }}
            >
              <span className="font-medium text-zinc-800">{c.full_name}</span>
              {c.phone && <span className="text-zinc-400 text-xs ml-auto">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
