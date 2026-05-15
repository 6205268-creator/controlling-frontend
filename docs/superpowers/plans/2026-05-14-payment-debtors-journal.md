# PaymentDialog, DebtorsPage, JournalPage & Dashboard Quick-Action — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add payment acceptance flow (modal + dashboard/contractor triggers), debtors page, and document journal page to the controlling-frontend SPA.

**Architecture:** Each feature is standalone, following existing patterns (OwnershipDialog → PaymentDialog, DashboardPage → JournalPage/DebtorsPage). PaymentDialog is a shared component used from both DashboardPage and ContractorsPage. All new API types live in `src/lib/api.ts`. No shared component extraction beyond PaymentDialog.

**Tech Stack:** React 18 · TypeScript (strict) · Tailwind CSS · shadcn/ui (Button, Input) · vitest · PostgREST at `http://103.35.190.117/pg`

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Create | `src/components/PaymentDialog.tsx` | Payment modal component |
| Create | `src/pages/DebtorsPage.tsx` | Debtors card page |
| Create | `src/pages/JournalPage.tsx` | Document journal with filters |
| Create | `src/lib/__tests__/payment-api.test.ts` | Tests for new API functions |
| Modify | `src/lib/api.ts` | + PaymentParams, createPayment, postPayment, DebtBreakdown, DebtorItem, JournalItem |
| Modify | `src/App.tsx` | + routes /debtors, /journal |
| Modify | `src/components/Sidebar.tsx` | + Должники, Журнал nav entries |
| Modify | `src/components/Layout.tsx` | + TITLES for /debtors, /journal |
| Modify | `src/pages/DashboardPage.tsx` | + refreshKey, quick-action button, PaymentDialog |
| Modify | `src/pages/ContractorsPage.tsx` | + per-row button, PaymentDialog |

---

## Task 1: API additions

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/lib/__tests__/payment-api.test.ts`

- [ ] **Step 1: Add types and functions to api.ts**

Append after the existing `postOwnership` function in `src/lib/api.ts`:

```ts
// --- Payments ---

export interface PaymentParams {
  orgId: string
  contractorId: string
  amount: number
  docDate: string      // YYYY-MM-DD
  eripRef?: string
}

export async function createPayment(params: PaymentParams): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/create_payment', {
    method: 'POST',
    body: JSON.stringify({
      p_org_id:        params.orgId,
      p_contractor_id: params.contractorId,
      p_amount:        params.amount,
      p_doc_date:      params.docDate,
      p_erip_ref:      params.eripRef ?? null,
    }),
  })
}

export async function postPayment(docId: string): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/post_payment', {
    method: 'POST',
    body: JSON.stringify({ p_doc_id: docId }),
  })
}

// --- Debtors ---

export interface DebtBreakdown {
  debt_type: string
  amount: number
}

export interface DebtorItem {
  contractor_id: string
  full_name: string
  phone: string | null
  total_debt: number
  breakdown: DebtBreakdown[] | null
}

// --- Journal ---

export interface JournalItem {
  id: string
  doc_type: string
  doc_date: string
  status: string
  amount: number | null
  contractor_name: string | null
}
```

- [ ] **Step 2: Write tests for payment API functions**

Create `src/lib/__tests__/payment-api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../auth', () => ({
  getToken: () => 'test-token',
  getOrgId: () => 'org-123',
  logout: vi.fn(),
}))

import { createPayment, postPayment } from '../api'

function okJson(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

beforeEach(() => mockFetch.mockReset())

describe('createPayment', () => {
  it('posts to /rpc/create_payment with correct params', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-pay-1' }))
    const result = await createPayment({
      orgId: 'org-1',
      contractorId: 'c-1',
      amount: 100.50,
      docDate: '2026-05-14',
    })
    expect(result.ok).toBe(true)
    expect(result.doc_id).toBe('doc-pay-1')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_amount).toBe(100.50)
    expect(body.p_doc_date).toBe('2026-05-14')
    expect(body.p_erip_ref).toBeNull()
  })

  it('includes erip_ref when provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-pay-2' }))
    await createPayment({
      orgId: 'org-1', contractorId: 'c-1', amount: 50,
      docDate: '2026-05-14', eripRef: 'ERIP-12345',
    })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_erip_ref).toBe('ERIP-12345')
  })

  it('returns ok:false on backend error', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: false, error: 'INVALID_AMOUNT' }))
    const result = await createPayment({
      orgId: 'org-1', contractorId: 'c-1', amount: 0, docDate: '2026-05-14',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')
  })
})

describe('postPayment', () => {
  it('posts to /rpc/post_payment with doc_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-pay-1' }))
    const result = await postPayment('doc-pay-1')
    expect(result.ok).toBe(true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_doc_id).toBe('doc-pay-1')
  })

  it('returns ok:false when already posted', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: false, error: 'ALREADY_POSTED' }))
    const result = await postPayment('doc-pay-1')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd /home/roman/controlling-frontend && npm test
```

Expected: all tests pass (including existing auth + ownership-api tests).

- [ ] **Step 4: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/lib/api.ts src/lib/__tests__/payment-api.test.ts
git commit -m "feat: add createPayment, postPayment API + types (JournalItem, DebtorItem)"
```

---

## Task 2: PaymentDialog component

**Files:**
- Create: `src/components/PaymentDialog.tsx`

**Pattern:** mirrors OwnershipDialog.tsx. Uses `searchContractors` for contractor lookup. No "create new" flow.

> **REQUIRED SKILL before writing code:** Invoke `frontend-design` skill to ensure production-grade visual quality. The skill will guide layout, spacing, color choices, and interaction states for the dialog. Apply its output to the component code below — adjust classes, structure, and visual details as recommended. Then proceed with Step 1.

- [ ] **Step 1: Invoke frontend-design skill**

Use the `frontend-design` skill (via Skill tool or `/frontend-design` command). Brief it with: "Payment dialog modal for a gardening association treasurer app. Dark zinc sidebar, white modal cards. Fields: contractor search (typeahead), amount (BYN), date, optional ERIP reference. Success/error inline states. Buttons: Cancel (outline) + Провести платёж (primary). Should feel clean and professional, not generic."

Apply visual recommendations (spacing, hover states, focus rings, loading state) to the component in Step 2.

- [ ] **Step 2: Create PaymentDialog.tsx**

Create `src/components/PaymentDialog.tsx`:

```tsx
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
  const [eripRef, setEripRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedContractor(preselectedContractor ?? null)
    setQuery('')
    setAmount('')
    setDocDate(new Date().toISOString().slice(0, 10))
    setEripRef('')
    setError(null)
    setSuccess(false)
    setSuggestions([])
  }, [open, preselectedContractor])

  useEffect(() => {
    if (selectedContractor || query.trim().length < 2) { setSuggestions([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try { setSuggestions(await searchContractors(orgId, query)) } catch { setSuggestions([]) }
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
        eripRef: eripRef.trim() || undefined,
      })
      if (!doc.ok) { setError(doc.error ?? 'Ошибка создания платежа'); setSubmitting(false); return }

      const posted = await postPayment(doc.doc_id as string)
      if (!posted.ok) { setError(posted.error ?? 'Ошибка проведения'); setSubmitting(false); return }

      setSuccess(true)
      setTimeout(() => { onPosted(); onClose() }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Принять платёж</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
        </div>

        {/* Плательщик */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Плательщик</label>
          {selectedContractor ? (
            <div className="flex items-center gap-2 border border-zinc-200 rounded-md px-3 py-2 bg-zinc-50">
              <span className="text-sm text-zinc-900 flex-1">{selectedContractor.full_name}</span>
              <button
                className="text-zinc-400 hover:text-zinc-600 text-xs"
                onClick={() => { setSelectedContractor(null); setQuery('') }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="Поиск по ФИО или телефону..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div className="border border-zinc-200 rounded-md divide-y divide-zinc-100 max-h-36 overflow-y-auto">
                  {suggestions.map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                      onClick={() => { setSelectedContractor(c); setSuggestions([]) }}
                    >
                      <span className="font-medium">{c.full_name}</span>
                      {c.phone && <span className="text-zinc-400 ml-2">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Сумма */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Сумма (BYN)</label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        {/* Дата и ЕРИП */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">Дата</label>
            <Input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700">ЕРИП-референс</label>
            <Input
              placeholder="Необязательно"
              value={eripRef}
              onChange={e => setEripRef(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2">
            Платёж проведён
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={submitting || success}>
            {submitting ? 'Проводим...' : 'Провести платёж'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/roman/controlling-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/components/PaymentDialog.tsx
git commit -m "feat: add PaymentDialog component"
```

---

## Task 3: Routes, Sidebar, Layout titles

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add routes to App.tsx**

In `src/App.tsx`, add two imports after `ContractorsPage` import:

```tsx
import DebtorsPage from './pages/DebtorsPage'
import JournalPage from './pages/JournalPage'
```

Add two routes after `<Route path="contractors" element={<ContractorsPage />} />`:

```tsx
<Route path="debtors" element={<DebtorsPage />} />
<Route path="journal" element={<JournalPage />} />
```

The full routes block should look like:

```tsx
<Route index element={<DashboardPage />} />
<Route path="plots" element={<PlotsPage />} />
<Route path="members" element={<MembersPage />} />
<Route path="meters" element={<MetersPage />} />
<Route path="contractors" element={<ContractorsPage />} />
<Route path="debtors" element={<DebtorsPage />} />
<Route path="journal" element={<JournalPage />} />
```

- [ ] **Step 2: Add nav entries to Sidebar.tsx**

In `src/components/Sidebar.tsx`, update the import line:

```tsx
import {
  LayoutDashboard, Home, Users, Zap, CreditCard, AlertCircle, BookOpen, LogOut, Menu,
} from 'lucide-react'
```

Update the NAV array — append two entries after the contractors entry:

```tsx
const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд', end: true },
  { to: '/plots', icon: Home, label: 'Участки', end: false },
  { to: '/members', icon: Users, label: 'Члены СТ', end: false },
  { to: '/meters', icon: Zap, label: 'Счётчики', end: false },
  { to: '/contractors', icon: CreditCard, label: 'Плательщики', end: false },
  { to: '/debtors', icon: AlertCircle, label: 'Должники', end: false },
  { to: '/journal', icon: BookOpen, label: 'Журнал', end: false },
]
```

- [ ] **Step 3: Add TITLES to Layout.tsx**

In `src/components/Layout.tsx`, update the TITLES map:

```tsx
const TITLES: Record<string, string> = {
  '/': 'Дашборд',
  '/plots': 'Участки',
  '/members': 'Члены СТ',
  '/meters': 'Счётчики',
  '/contractors': 'Плательщики',
  '/debtors': 'Должники',
  '/journal': 'Журнал',
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/roman/controlling-frontend && npx tsc --noEmit
```

Expected: errors about missing DebtorsPage and JournalPage modules (they don't exist yet — this is expected at this stage, the app won't build until Tasks 6 and 7 are done). If you want to verify intermediate state, temporarily create empty placeholder files:

```bash
echo 'export default function DebtorsPage() { return <div>Должники</div> }' > src/pages/DebtorsPage.tsx
echo 'export default function JournalPage() { return <div>Журнал</div> }' > src/pages/JournalPage.tsx
npx tsc --noEmit
```

Delete the placeholders after check — Tasks 6 and 7 will create the real files.

- [ ] **Step 5: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/App.tsx src/components/Sidebar.tsx src/components/Layout.tsx
git commit -m "feat: add /debtors, /journal routes + sidebar nav + layout titles"
```

---

## Task 4: Dashboard quick-action button

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

Changes: import PaymentDialog, add `refreshKey` state for data reload, add header row with "Принять платёж" button, wire up PaymentDialog. Also replace the local `DocJournalItem` type with the shared `JournalItem` from api.ts.

- [ ] **Step 1: Rewrite DashboardPage.tsx**

Replace the entire content of `src/pages/DashboardPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { apiFetch, orgParam, type JournalItem } from '../lib/api'
import { Button } from '@/components/ui/button'
import PaymentDialog from '../components/PaymentDialog'

interface ObjectDebt {
  total_debt: number
}

interface PlotSummaryItem { id: string }
interface ContractorItem { id: string }

const DOC_TYPE_LABELS: Record<string, string> = {
  payment: 'Платёж',
  accrual: 'Начисление',
  distribution: 'Распределение',
  meter_reading: 'Показание счётчика',
  meter_charge: 'Начисление по счётчику',
  period_close: 'Закрытие периода',
  meter_correction: 'Корректировка счётчика',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  posted: 'Проведён',
  cancelled: 'Отменён',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  posted: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function fmt(amount: number | null): string {
  if (amount === null) return '—'
  return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' BYN'
}

function fmtDate(d: string): string {
  return d.split('-').reverse().join('.')
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<JournalItem[]>([])
  const [plotCount, setPlotCount] = useState<number | null>(null)
  const [contractorCount, setContractorCount] = useState<number | null>(null)
  const [totalDebt, setTotalDebt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [paymentOpen, setPaymentOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    const q = orgParam()
    Promise.all([
      apiFetch<JournalItem[]>(`/doc_journal?${q}&order=doc_date.desc&limit=20`),
      apiFetch<PlotSummaryItem[]>(`/plot_summary?${q}&select=id`),
      apiFetch<ContractorItem[]>(`/contractors?${q}&select=id`),
      apiFetch<ObjectDebt[]>(`/object_debts?${q}&select=total_debt`),
    ]).then(([d, plots, contractors, debts]) => {
      setDocs(d)
      setPlotCount(plots.length)
      setContractorCount(contractors.length)
      const sum = debts.reduce((acc, row) => acc + (row.total_debt ?? 0), 0)
      setTotalDebt(sum)
    }).finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      {/* Quick-action header */}
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={() => setPaymentOpen(true)}>
          + Принять платёж
        </Button>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Участков</p>
          <p className="text-2xl font-bold text-zinc-900">{plotCount ?? '—'}</p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Плательщиков</p>
          <p className="text-2xl font-bold text-zinc-900">{contractorCount ?? '—'}</p>
        </div>
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Общий долг</p>
          <p className="text-2xl font-bold text-red-600">
            {totalDebt !== null ? fmt(totalDebt) : '—'}
          </p>
        </div>
      </div>

      {/* Таблица операций */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Последние операции</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Дата</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Плательщик</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Сумма</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => (
              <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 text-zinc-600">{fmtDate(d.doc_date)}</td>
                <td className="px-5 py-3 text-zinc-700">{DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type}</td>
                <td className="px-5 py-3 text-zinc-700">{d.contractor_name ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-700">{fmt(d.amount)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-sm">Операций нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onPosted={() => { setRefreshKey(k => k + 1) }}
      />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/roman/controlling-frontend && npx tsc --noEmit
```

Expected: no errors (DebtorsPage and JournalPage may cause module-not-found errors if placeholders were deleted — if so, recreate them temporarily as per Task 3 Step 4).

- [ ] **Step 3: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/pages/DashboardPage.tsx
git commit -m "feat: add quick-action payment button to dashboard + auto-refresh on post"
```

---

## Task 5: ContractorsPage per-row button

**Files:**
- Modify: `src/pages/ContractorsPage.tsx`

Add a "Принять платёж" button per contractor row. Opens PaymentDialog with that contractor pre-selected.

- [ ] **Step 1: Rewrite ContractorsPage.tsx**

Replace the entire content of `src/pages/ContractorsPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PaymentDialog from '../components/PaymentDialog'

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
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; full_name: string } | null>(null)

  function load() {
    const q = orgParam()
    Promise.all([
      apiFetch<Contractor[]>(`/contractors?${q}&order=full_name.asc`),
      apiFetch<Balance[]>(`/account_balances?${q}`),
    ]).then(([contractors, balances]) => {
      const bMap = new Map(balances.map(b => [b.contractor_id, b.balance]))
      setRows(contractors.map(c => ({ ...c, balance: bMap.get(c.id) ?? 0 })))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Действия</th>
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
                  <td className="px-5 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPaymentTarget({ id: r.id, full_name: r.full_name })}
                    >
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/roman/controlling-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/pages/ContractorsPage.tsx
git commit -m "feat: add per-row payment button to ContractorsPage"
```

---

## Task 6: DebtorsPage

**Files:**
- Create: `src/pages/DebtorsPage.tsx`

> **REQUIRED SKILL before writing code:** Invoke `frontend-design` skill. Brief it with: "Debtors page for a gardening association treasurer app. Shows debtor cards (not a table). Each card: full name bold + phone, total debt in red on the right (e.g. '−100 BYN'), row of red badge tags per debt type below (e.g. 'Членский взнос: 70 BYN'). Summary line at top: 'N должников · общий долг −X BYN'. Empty state when no debtors. Dark zinc sidebar context, white cards on zinc-100 background." Apply visual recommendations to Step 1 code.

> **IMPORTANT — verify backend schema first:**
> Before writing the grouping logic, run:
> ```bash
> curl -s "http://localhost:3100/debtors?organization_id=eq.<YOUR_ORG_ID>&limit=5" | python3 -m json.tool
> ```
> Replace `<YOUR_ORG_ID>` with the org id from localStorage (`controlling_org_id`).
>
> - If the response has `debt_type` and `type_amount` fields (multiple rows per contractor) → the grouping logic in step 1 is correct.
> - If the response has only `total_debt` per contractor (one row per contractor, no breakdown) → remove the breakdown grouping, show only the total debt card without type badges.
> - If the `debtors` view doesn't exist (404) → stop and flag to the user: backend view needs to be created.

- [ ] **Step 1: Create DebtorsPage.tsx**

Create `src/pages/DebtorsPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { apiFetch, orgParam } from '../lib/api'

interface DebtorRow {
  contractor_id: string
  full_name: string
  phone: string | null
  total_debt: number
  debt_type?: string | null
  type_amount?: number | null
}

interface DebtorCard {
  contractor_id: string
  full_name: string
  phone: string | null
  total_debt: number
  breakdown: { debt_type: string; amount: number }[]
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  membership_fee: 'Членский взнос',
  electricity: 'Электричество',
  land_tax: 'Земельный налог',
  target: 'Целевой взнос',
  penalty: 'Пеня',
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function groupRows(rows: DebtorRow[]): DebtorCard[] {
  const map = new Map<string, DebtorCard>()
  for (const row of rows) {
    if (!map.has(row.contractor_id)) {
      map.set(row.contractor_id, {
        contractor_id: row.contractor_id,
        full_name: row.full_name,
        phone: row.phone,
        total_debt: row.total_debt,
        breakdown: [],
      })
    }
    const card = map.get(row.contractor_id)!
    if (row.debt_type && row.type_amount) {
      card.breakdown.push({ debt_type: row.debt_type, amount: row.type_amount })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_debt - a.total_debt)
}

export default function DebtorsPage() {
  const [cards, setCards] = useState<DebtorCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<DebtorRow[]>(`/debtors?${orgParam()}`)
      .then(rows => setCards(groupRows(rows)))
      .catch(e => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>
  if (error) return <p className="text-red-600 text-sm">{error}</p>

  const totalDebt = cards.reduce((s, c) => s + c.total_debt, 0)

  return (
    <div>
      {/* Summary */}
      <p className="text-sm text-zinc-500 mb-5">
        {cards.length} должников · общий долг{' '}
        <span className="text-red-600 font-semibold">−{fmt(totalDebt)} BYN</span>
      </p>

      {cards.length === 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 px-5 py-10 text-center text-zinc-400 text-sm">
          Должников нет
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {cards.map(card => (
          <div key={card.contractor_id} className="bg-white rounded-lg border border-zinc-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-zinc-900">{card.full_name}</p>
                {card.phone && (
                  <p className="text-sm text-zinc-400 mt-0.5">{card.phone}</p>
                )}
              </div>
              <p className="text-lg font-bold text-red-600 whitespace-nowrap shrink-0">
                −{fmt(card.total_debt)} BYN
              </p>
            </div>

            {card.breakdown.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {card.breakdown.map(b => (
                  <span
                    key={b.debt_type}
                    className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 font-medium"
                  >
                    {DEBT_TYPE_LABELS[b.debt_type] ?? b.debt_type}: {fmt(b.amount)} BYN
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/roman/controlling-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/pages/DebtorsPage.tsx
git commit -m "feat: add DebtorsPage with debt breakdown cards"
```

---

## Task 7: JournalPage

**Files:**
- Create: `src/pages/JournalPage.tsx`

Client-side filtering over 100 most recent documents. Same visual table pattern as DashboardPage.

- [ ] **Step 1: Create JournalPage.tsx**

Create `src/pages/JournalPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { apiFetch, orgParam, type JournalItem } from '../lib/api'
import { Input } from '@/components/ui/input'

const DOC_TYPE_LABELS: Record<string, string> = {
  payment: 'Платёж',
  accrual: 'Начисление',
  distribution: 'Распределение',
  meter_reading: 'Показание счётчика',
  meter_charge: 'Начисление по счётчику',
  period_close: 'Закрытие периода',
  meter_correction: 'Корректировка счётчика',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  posted: 'Проведён',
  cancelled: 'Отменён',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  posted: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function fmt(amount: number | null): string {
  if (amount === null) return '—'
  return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' BYN'
}

function fmtDate(d: string): string {
  return d.split('-').reverse().join('.')
}

export default function JournalPage() {
  const [docs, setDocs] = useState<JournalItem[]>([])
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterContractor, setFilterContractor] = useState('')

  useEffect(() => {
    apiFetch<JournalItem[]>(`/doc_journal?${orgParam()}&order=doc_date.desc&limit=100`)
      .then(setDocs)
      .finally(() => setLoading(false))
  }, [])

  const filtered = docs.filter(d => {
    if (filterType && d.doc_type !== filterType) return false
    if (filterStatus && d.status !== filterStatus) return false
    if (filterDateFrom && d.doc_date < filterDateFrom) return false
    if (filterDateTo && d.doc_date > filterDateTo) return false
    if (filterContractor && !(d.contractor_name ?? '').toLowerCase().includes(filterContractor.toLowerCase())) return false
    return true
  })

  if (loading) return <p className="text-zinc-400 text-sm">Загрузка...</p>

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white text-zinc-700 min-w-[160px]"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">Все типы</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white text-zinc-700 min-w-[140px]"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="w-36"
            placeholder="Дата с"
          />
          <span className="text-zinc-400 text-sm">—</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="w-36"
            placeholder="Дата по"
          />
        </div>

        <Input
          placeholder="Плательщик..."
          value={filterContractor}
          onChange={e => setFilterContractor(e.target.value)}
          className="max-w-xs"
        />

        <span className="text-sm text-zinc-400 self-center">{filtered.length} записей</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Дата</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Тип</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Плательщик</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Сумма</th>
              <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                <td className="px-5 py-3 text-zinc-600">{fmtDate(d.doc_date)}</td>
                <td className="px-5 py-3 text-zinc-700">{DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type}</td>
                <td className="px-5 py-3 text-zinc-700">{d.contractor_name ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-700">{fmt(d.amount)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 text-sm">
                  {docs.length === 0 ? 'Документов нет' : 'Нет документов по фильтру'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/roman/controlling-frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/roman/controlling-frontend
git add src/pages/JournalPage.tsx
git commit -m "feat: add JournalPage with client-side filters"
```

---

## Task 8: Build and deploy

- [ ] **Step 1: Full build**

```bash
cd /home/roman/controlling-frontend && npm run build
```

Expected: Build complete, no errors. Output in `dist/`.

- [ ] **Step 2: Run all tests**

```bash
cd /home/roman/controlling-frontend && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Deploy**

```bash
cd /home/roman/controlling-frontend && docker compose build && docker compose up -d
```

Expected: container starts, no build errors.

- [ ] **Step 4: Smoke-test in browser**

Open `http://103.35.190.117:3000`, login as `demo_a_treasury / treasury123`. Verify:

1. Sidebar shows "Должники" and "Журнал" links
2. Dashboard → "Принять платёж" button opens PaymentDialog
3. PaymentDialog → search contractor → fill amount → click "Провести платёж" → success toast → dialog closes → dashboard data reloads
4. Contractors page → "Принять платёж" button on any row → dialog opens with that contractor pre-selected
5. `/debtors` loads (check console if breakdown field is missing — flag if so)
6. `/journal` loads table + all 5 filters work

- [ ] **Step 5: Push**

```bash
cd /home/roman/controlling-frontend && git push origin master
```

---

## Spec coverage check

| Spec requirement | Covered by |
|-----------------|-----------|
| PaymentDialog props (open, onClose, onPosted, preselectedContractor) | Task 2 |
| Contractor text search via searchContractors() | Task 2 |
| Amount > 0 validation | Task 2 |
| Date default today | Task 2 |
| ERIP reference optional | Task 2 |
| POST /rpc/create_payment → doc_id | Task 1 + Task 2 |
| POST /rpc/post_payment | Task 1 + Task 2 |
| Inline error, dialog stays open on error | Task 2 |
| Dashboard "Принять платёж" button | Task 4 |
| Dashboard data reloads after post | Task 4 |
| ContractorsPage per-row button + preselection | Task 5 |
| DebtorsPage /debtors route | Task 3 + Task 6 |
| Debtor cards with total + breakdown badges | Task 6 |
| Summary "N должников · долг −X BYN" | Task 6 |
| JournalPage /journal route | Task 3 + Task 7 |
| Journal table: Дата, Тип, Плательщик, Сумма, Статус | Task 7 |
| Filter by type, status, date range, contractor name | Task 7 |
| Sidebar links Должники, Журнал | Task 3 |
| Layout TITLES for new routes | Task 3 |
| createPayment, postPayment in api.ts | Task 1 |
| PaymentParams, DebtorItem, JournalItem types | Task 1 |
| API tests for createPayment, postPayment | Task 1 |
