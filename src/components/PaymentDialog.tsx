import { useEffect, useRef, useState } from 'react'
import { getOrgId } from '../lib/auth'
import { searchContractors, createPayment, postPayment, type Contractor } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  onPosted: () => void
  preselectedContractor?: { id: string; full_name: string } | null
}

export default function PaymentDialog({ open, onClose, onPosted, preselectedContractor }: Props) {
  const orgId = getOrgId() ?? ''

  const [selectedContractor, setSelectedContractor] = useState<{ id: string; full_name: string } | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Contractor[]>([])
  const [amount, setAmount] = useState('')
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentRef, setPaymentRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (successTimer.current) { clearTimeout(successTimer.current); successTimer.current = null }
    if (!open) return
    setSelectedContractor(preselectedContractor ?? null)
    setQuery('')
    setAmount('')
    setDocDate(new Date().toISOString().slice(0, 10))
    setPaymentRef('')
    setError(null)
    setSuccess(false)
    setSuggestions([])
  }, [open, preselectedContractor])

  useEffect(() => {
    if (selectedContractor || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        setSuggestions(await searchContractors(orgId, query))
      } catch {
        setSuggestions([])
      }
    }, 300)
  }, [query, selectedContractor, orgId])

  async function handleSubmit() {
    if (!selectedContractor) { setError('Выберите плательщика'); return }
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setError('Введите сумму больше 0'); return }
    if (!docDate) { setError('Введите дату'); return }

    setSubmitting(true)
    setError(null)
    try {
      const doc = await createPayment({
        orgId,
        contractorId: selectedContractor.id,
        amount: amountNum,
        docDate,
        paymentRef: paymentRef.trim() || undefined,
      })
      if (!doc.ok) { setError(doc.error ?? 'Ошибка создания платежа'); setSubmitting(false); return }

      const docId = typeof doc.doc_id === 'string' ? doc.doc_id : null
      if (!docId) { setError('Не получен ID документа'); setSubmitting(false); return }
      const posted = await postPayment(docId)
      if (!posted.ok) { setError(posted.error ?? 'Ошибка проведения'); setSubmitting(false); return }

      setSuccess(true)
      successTimer.current = setTimeout(() => { onPosted(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Принять платёж</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Заполните данные и проведите документ</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="h-px bg-zinc-100" />

        {/* Плательщик */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            Плательщик
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          {selectedContractor ? (
            <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-2.5 bg-zinc-50 ring-1 ring-zinc-200">
              <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-zinc-600">
                  {selectedContractor.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-zinc-900 flex-1 truncate">{selectedContractor.full_name}</span>
              {!preselectedContractor && (
                <button
                  className="w-5 h-5 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors text-xs flex-shrink-0"
                  onClick={() => { setSelectedContractor(null); setQuery('') }}
                  title="Очистить"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="Поиск по ФИО или телефону..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="focus-visible:ring-zinc-400"
              />
              {suggestions.length > 0 && (
                <div className="border border-zinc-200 rounded-lg shadow-sm divide-y divide-zinc-100 max-h-36 overflow-y-auto">
                  {suggestions.map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      onClick={() => { setSelectedContractor(c); setSuggestions([]) }}
                    >
                      <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-zinc-600">
                          {c.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-zinc-900 truncate">{c.full_name}</span>
                      {c.phone && <span className="text-zinc-400 ml-auto flex-shrink-0">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Сумма */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            Сумма (BYN)
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="pr-14 focus-visible:ring-zinc-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">
              BYN
            </span>
          </div>
        </div>

        {/* Дата и ЕРИП */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Дата
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Input
              type="date"
              value={docDate}
              onChange={e => setDocDate(e.target.value)}
              className="focus-visible:ring-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">
              ЕРИП-референс
              <span className="text-zinc-400 text-xs font-normal ml-1">(необяз.)</span>
            </label>
            <Input
              placeholder="Например, 1234567"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              className="focus-visible:ring-zinc-400"
            />
          </div>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="flex items-start gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
            <span className="flex-shrink-0">✓</span>
            <span>Платёж проведён</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={submitting || success}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Проводим...
              </span>
            ) : 'Провести платёж'}
          </Button>
        </div>
      </div>
    </div>
  )
}
