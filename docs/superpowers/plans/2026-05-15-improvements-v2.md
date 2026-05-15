# Improvements v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить 6 групп замечаний: навигация с дашборда, редактирование участков и счётчиков, переименование раздела контрагентов с фильтром и иконками, переименование журнала и отмена операций, заглушка раздела «Настройки».

**Architecture:** Все изменения только на фронтенде. Используем существующие PostgREST-эндпоинты: `PATCH /plots`, `POST /meters`, `PATCH /meters`, `POST /rpc/cancel_document`. Новых RPC не требуется. Каждая задача независима — можно реализовывать в любом порядке после Task 1.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS, shadcn/ui (Button, Input, Dialog), lucide-react, react-router-dom v7, Vitest + jsdom.

**API Base:** `http://103.35.190.117/pg` (PostgREST). Auth: Bearer JWT в `localStorage` через `getToken()`.  
**Тест-логин:** `demo_a_treasury` / `treasury123` → org `8d13448d-cf55-4cde-aae8-a637625b6788`

---

## File Map

| Файл | Действие | Задача |
|------|----------|--------|
| `src/lib/api.ts` | Modify — добавить `updatePlot`, `addMeter`, `updateMeter`, `cancelDocument`, экспорт `PlotSummary` | T1 |
| `src/lib/__tests__/plots-meters-api.test.ts` | Create — тесты новых API-функций | T1 |
| `src/App.tsx` | Modify — маршруты `/counterparties`, `/settings`, redirect `/contractors` | T2 |
| `src/components/Layout.tsx` | Modify — добавить заголовки для новых маршрутов | T2 |
| `src/components/Sidebar.tsx` | Modify — переименовать «Плательщики»→«Контрагенты», обновить URLs, добавить «Настройки» | T2 |
| `src/pages/DashboardPage.tsx` | Modify — карточки стат в `<Link>` | T3 |
| `src/pages/PlotsPage.tsx` | Modify — кнопка «Редактировать» + EditPlotDialog | T4 |
| `src/pages/MetersPage.tsx` | Modify — кнопки «Добавить»/«Редактировать» + MeterDialog, fix gas label | T5 |
| `src/pages/CounterpartiesPage.tsx` | Create — переименованный ContractorsPage + фильтр по типу + иконки | T6 |
| `src/pages/JournalPage.tsx` | Modify — заголовок «Операций», кнопка «Отменить» с подтверждением | T7 |
| `src/pages/SettingsPage.tsx` | Create — заглушка «В разработке» | T8 |

---

## Task 1: API Layer

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/lib/__tests__/plots-meters-api.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/__tests__/plots-meters-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../auth', () => ({
  getToken: () => 'test-token',
  getOrgId: () => 'org-123',
  logout: vi.fn(),
}))

import { updatePlot, addMeter, updateMeter, cancelDocument } from '../api'

function ok204() {
  return Promise.resolve({ ok: true, status: 204, json: async () => ({}) })
}
function okJson(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

beforeEach(() => mockFetch.mockReset())

describe('updatePlot', () => {
  it('sends PATCH to /plots?id=eq.<uuid>', async () => {
    mockFetch.mockResolvedValueOnce(ok204())
    await updatePlot('plot-1', { number: '5', area: 6.1, is_active: true })
    expect(mockFetch.mock.calls[0][0]).toContain('/plots?id=eq.plot-1')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.number).toBe('5')
    expect(body.area).toBe(6.1)
    expect(body.is_active).toBe(true)
  })
})

describe('addMeter', () => {
  it('sends POST to /meters with correct fields', async () => {
    mockFetch.mockResolvedValueOnce(ok204())
    await addMeter({ orgId: 'org-1', plotId: 'plot-1', meterType: 'water', serialNumber: 'SN-001' })
    expect(mockFetch.mock.calls[0][0]).toContain('/meters')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.organization_id).toBe('org-1')
    expect(body.plot_id).toBe('plot-1')
    expect(body.meter_type).toBe('water')
    expect(body.serial_number).toBe('SN-001')
    expect(body.is_active).toBe(true)
  })
})

describe('updateMeter', () => {
  it('sends PATCH to /meters?id=eq.<uuid>', async () => {
    mockFetch.mockResolvedValueOnce(ok204())
    await updateMeter('meter-1', { meter_type: 'electricity', serial_number: 'SN-002', is_active: false })
    expect(mockFetch.mock.calls[0][0]).toContain('/meters?id=eq.meter-1')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.meter_type).toBe('electricity')
    expect(body.is_active).toBe(false)
  })
})

describe('cancelDocument', () => {
  it('posts to /rpc/cancel_document with p_doc_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true }))
    const result = await cancelDocument('doc-1')
    expect(result.ok).toBe(true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_doc_id).toBe('doc-1')
  })
})
```

- [ ] **Step 2: Run tests — убедиться что падают**

```bash
cd /home/roman/controlling-frontend && npx vitest run src/lib/__tests__/plots-meters-api.test.ts
```

Ожидаем: FAIL — `updatePlot is not a function` и т.д.

- [ ] **Step 3: Добавить новые функции и типы в api.ts**

В конец файла `src/lib/api.ts` добавить:

```typescript
// --- Plots edit ---

export async function updatePlot(
  id: string,
  data: { number: string; area: number; is_active: boolean }
): Promise<void> {
  return apiFetch<void>(`/plots?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// --- Meters ---

export interface PlotSummary {
  id: string
  number: string
  area: number
  is_active: boolean
  owner_id: string | null
  owner_name: string | null
  owner_phone: string | null
}

export async function getPlotsByOwner(ownerId: string): Promise<PlotSummary[]> {
  return apiFetch<PlotSummary[]>(`/plot_summary?owner_id=eq.${ownerId}&${orgParam()}`)
}

export async function addMeter(params: {
  orgId: string
  plotId: string
  meterType: string
  serialNumber: string
}): Promise<void> {
  return apiFetch<void>('/meters', {
    method: 'POST',
    body: JSON.stringify({
      organization_id: params.orgId,
      plot_id:         params.plotId,
      meter_type:      params.meterType,
      serial_number:   params.serialNumber,
      is_active:       true,
    }),
  })
}

export async function updateMeter(
  id: string,
  data: { meter_type: string; serial_number: string; is_active: boolean }
): Promise<void> {
  return apiFetch<void>(`/meters?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// --- Cancel document ---

export async function cancelDocument(docId: string): Promise<RpcResult> {
  return apiPost<RpcResult>('/rpc/cancel_document', { p_doc_id: docId })
}
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
npx vitest run src/lib/__tests__/plots-meters-api.test.ts
```

Ожидаем: все 4 describe-блока — PASS.

- [ ] **Step 5: Запустить все тесты — нет регрессий**

```bash
npx vitest run
```

Ожидаем: все PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api.ts src/lib/__tests__/plots-meters-api.test.ts
git commit -m "feat: add updatePlot, addMeter, updateMeter, cancelDocument API functions"
```

---

## Task 2: Routing + Sidebar + Layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Обновить App.tsx**

Заменить содержимое `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './lib/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlotsPage from './pages/PlotsPage'
import MembersPage from './pages/MembersPage'
import MetersPage from './pages/MetersPage'
import CounterpartiesPage from './pages/CounterpartiesPage'
import DebtorsPage from './pages/DebtorsPage'
import JournalPage from './pages/JournalPage'
import SettingsPage from './pages/SettingsPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="plots" element={<PlotsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="meters" element={<MetersPage />} />
          <Route path="counterparties" element={<CounterpartiesPage />} />
          <Route path="contractors" element={<Navigate to="/counterparties" replace />} />
          <Route path="debtors" element={<DebtorsPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Обновить Layout.tsx**

Заменить константу `TITLES`:

```typescript
const TITLES: Record<string, string> = {
  '/': 'Дашборд',
  '/plots': 'Участки',
  '/members': 'Члены СТ',
  '/meters': 'Счётчики',
  '/counterparties': 'Контрагенты',
  '/debtors': 'Должники',
  '/journal': 'Журнал операций',
  '/settings': 'Настройки',
}
```

- [ ] **Step 3: Обновить Sidebar.tsx**

Заменить импорты иконок и массив NAV:

```typescript
import {
  LayoutDashboard, Home, Users, Zap, Briefcase, LogOut, Menu, AlertCircle, BookOpen, Settings,
} from 'lucide-react'
```

```typescript
const NAV = [
  { to: '/',                icon: LayoutDashboard, label: 'Дашборд',      end: true  },
  { to: '/plots',           icon: Home,            label: 'Участки',       end: false },
  { to: '/members',         icon: Users,           label: 'Члены СТ',      end: false },
  { to: '/meters',          icon: Zap,             label: 'Счётчики',      end: false },
  { to: '/counterparties',  icon: Briefcase,       label: 'Контрагенты',   end: false },
  { to: '/debtors',         icon: AlertCircle,     label: 'Должники',      end: false },
  { to: '/journal',         icon: BookOpen,        label: 'Журнал',        end: false },
  { to: '/settings',        icon: Settings,        label: 'Настройки',     end: false },
]
```

> Иконка `CreditCard` → `Briefcase` (портфель — нейтральнее для «Контрагентов»).

- [ ] **Step 4: Создать заглушку CounterpartiesPage.tsx (временно)**

```typescript
// src/pages/CounterpartiesPage.tsx
export default function CounterpartiesPage() {
  return <p className="text-zinc-400 text-sm">Загрузка...</p>
}
```

(Полная реализация — Task 6.)

- [ ] **Step 5: Создать заглушку SettingsPage.tsx**

```typescript
// src/pages/SettingsPage.tsx
export default function SettingsPage() {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center">
      <p className="text-zinc-400 text-sm">Раздел в разработке</p>
    </div>
  )
}
```

- [ ] **Step 6: Запустить TypeScript-проверку**

```bash
npx tsc --noEmit
```

Ожидаем: 0 ошибок.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx src/components/Sidebar.tsx src/pages/CounterpartiesPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: add /counterparties + /settings routes, update sidebar nav"
```

---

## Task 3: Dashboard — кликабельные карточки

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Добавить импорт Link**

В начало файла добавить:

```typescript
import { Link } from 'react-router-dom'
```

- [ ] **Step 2: Обернуть карточки в Link**

Заменить блок `{/* Карточки */}`:

```tsx
{/* Карточки */}
<div className="grid grid-cols-3 gap-4 mb-6">
  <Link to="/plots" className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 transition-colors">
    <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Участков</p>
    <p className="text-2xl font-bold text-zinc-900">{plotCount ?? '—'}</p>
  </Link>
  <Link to="/counterparties" className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 transition-colors">
    <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Контрагентов</p>
    <p className="text-2xl font-bold text-zinc-900">{contractorCount ?? '—'}</p>
  </Link>
  <Link to="/debtors" className="block bg-white rounded-lg border border-zinc-200 p-5 hover:border-zinc-400 transition-colors">
    <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Общий долг</p>
    <p className="text-2xl font-bold text-red-600">
      {totalDebt !== null ? fmt(totalDebt) : '—'}
    </p>
  </Link>
</div>
```

> Также обновить запрос: `apiFetch<ContractorItem[]>('/contractors?...')` — URL оставить `/contractors` (PostgREST-таблица не переименовывается, меняется только маршрут фронтенда).

- [ ] **Step 3: Собрать и проверить в браузере**

```bash
docker compose build && docker compose up -d
```

Открыть `http://localhost:3000` → войти → кликнуть каждую из 3 карточек → проверить переход.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: make dashboard stat cards navigate to /plots, /counterparties, /debtors"
```

---

## Task 4: Участки — редактирование

**Files:**
- Modify: `src/pages/PlotsPage.tsx`

- [ ] **Step 1: Добавить импорты**

Добавить в начало PlotsPage.tsx:

```typescript
import { Pencil } from 'lucide-react'
import { updatePlot } from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
```

- [ ] **Step 2: Добавить состояние для диалога редактирования**

После `const [preselectedPlot, ...]` добавить:

```typescript
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
```

- [ ] **Step 3: Добавить кнопку Редактировать в строку таблицы**

Найти последнюю `<td>` в строке таблицы (там где `!p.owner_id && ...`) и изменить на:

```tsx
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
```

- [ ] **Step 4: Добавить диалог EditPlotDialog перед закрывающим тегом `</div>`**

Перед `<OwnershipDialog` добавить:

```tsx
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
```

- [ ] **Step 5: Убедиться что интерфейс PlotSummary совместим с полем area**

В PlotsPage интерфейс `PlotSummary` объявлен локально. Проверить — поле `area: number`. Всё совместимо.

- [ ] **Step 6: Проверить TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Собрать и проверить в браузере**

```bash
docker compose build && docker compose up -d
```

Открыть `/plots` → кликнуть карандаш в строке → заполнить форму → сохранить → убедиться что список обновился.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PlotsPage.tsx
git commit -m "feat: add plot edit dialog (number, area, is_active) via PATCH /plots"
```

---

## Task 5: Счётчики — добавление и редактирование

**Files:**
- Modify: `src/pages/MetersPage.tsx`

- [ ] **Step 1: Добавить импорты**

```typescript
import { Pencil } from 'lucide-react'
import { getOrgId } from '../lib/auth'
import { searchContractors, getPlotsByOwner, addMeter, updateMeter, type Contractor, type PlotSummary } from '../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
```

- [ ] **Step 2: Исправить TYPE_LABELS — добавить gas**

```typescript
const TYPE_LABELS: Record<string, string> = {
  water:       'Вода',
  electricity: 'Электричество',
  gas:         'Газ',
}
```

- [ ] **Step 3: Добавить состояние для диалогов добавления и редактирования**

После `const [loading, ...]` добавить:

```typescript
// --- Add meter state ---
const [addOpen, setAddOpen] = useState(false)
const [addQuery, setAddQuery] = useState('')
const [addContractors, setAddContractors] = useState<Contractor[]>([])
const [addOwner, setAddOwner] = useState<Contractor | null>(null)
const [addPlots, setAddPlots] = useState<PlotSummary[]>([])
const [addPlotId, setAddPlotId] = useState('')
const [addType, setAddType] = useState('water')
const [addSerial, setAddSerial] = useState('')
const [addError, setAddError] = useState<string | null>(null)
const [addSaving, setAddSaving] = useState(false)
const [addPlotsLoading, setAddPlotsLoading] = useState(false)

// --- Edit meter state ---
interface MeterEditTarget { id: string; meter_type: string; serial_number: string; is_active: boolean }
const [editTarget, setEditTarget] = useState<MeterEditTarget | null>(null)
const [editForm, setEditForm] = useState({ meter_type: 'water', serial_number: '', is_active: true })
const [editError, setEditError] = useState<string | null>(null)
const [editSaving, setEditSaving] = useState(false)
```

- [ ] **Step 4: Добавить функции поиска контрагента, выбора владельца, сохранения**

После объявления состояний добавить:

```typescript
async function searchOwners(q: string) {
  if (q.length < 2) { setAddContractors([]); return }
  const orgId = getOrgId() ?? ''
  const results = await searchContractors(orgId, q)
  setAddContractors(results)
}

async function selectOwner(c: Contractor) {
  setAddOwner(c)
  setAddContractors([])
  setAddQuery(c.full_name)
  setAddPlotId('')
  setAddPlotsLoading(true)
  setAddError(null)
  try {
    const plots = await getPlotsByOwner(c.id)
    setAddPlots(plots)
    if (plots.length === 0) setAddError('У этого контрагента нет участков')
    if (plots.length === 1) setAddPlotId(plots[0].id)
  } finally {
    setAddPlotsLoading(false)
  }
}

async function saveAdd() {
  if (!addOwner || !addPlotId || !addSerial.trim()) {
    setAddError('Заполните все поля')
    return
  }
  setAddSaving(true)
  setAddError(null)
  try {
    await addMeter({ orgId: getOrgId() ?? '', plotId: addPlotId, meterType: addType, serialNumber: addSerial.trim() })
    setAddOpen(false)
    setAddQuery(''); setAddOwner(null); setAddPlots([]); setAddPlotId(''); setAddSerial(''); setAddType('water')
    loadMeters()
  } catch {
    setAddError('Ошибка сохранения')
  } finally {
    setAddSaving(false)
  }
}

async function saveEdit() {
  if (!editTarget || !editForm.serial_number.trim()) {
    setEditError('Серийный номер обязателен')
    return
  }
  setEditSaving(true)
  setEditError(null)
  try {
    await updateMeter(editTarget.id, { meter_type: editForm.meter_type, serial_number: editForm.serial_number.trim(), is_active: editForm.is_active })
    setEditTarget(null)
    loadMeters()
  } catch {
    setEditError('Ошибка сохранения')
  } finally {
    setEditSaving(false)
  }
}
```

- [ ] **Step 5: Вынести загрузку данных в отдельную функцию `loadMeters`**

Текущий `useEffect` переписать:

```typescript
function loadMeters() {
  const q = orgParam()
  Promise.all([
    apiFetch<Meter[]>(`/meters?${q}&order=serial_number.asc`),
    apiFetch<Plot[]>(`/plots?${q}&select=id,number`),
  ]).then(([meters, plots]) => {
    const pMap = new Map(plots.map(p => [p.id, p.number]))
    setRows(meters.map(m => ({
      id: m.id,
      meter_type: m.meter_type,
      serial_number: m.serial_number,
      plot_number: m.plot_id ? (pMap.get(m.plot_id) ?? null) : null,
      is_active: m.is_active,
    })))
  }).finally(() => setLoading(false))
}

useEffect(() => { loadMeters() }, [])
```

- [ ] **Step 6: Добавить кнопку «Добавить счётчик» и кнопку Pencil в строку**

Заменить блок фильтров (div с табами) и обернуть в flex с кнопкой:

```tsx
<div className="flex items-center gap-4 mb-5">
  <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
    {tabs.map(t => (
      <button key={t.key} onClick={() => setFilter(t.key)}
        className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
          filter === t.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-500 hover:text-zinc-700'
        }`}
      >{t.label}</button>
    ))}
  </div>
  <Button className="ml-auto" onClick={() => { setAddOpen(true); setAddQuery(''); setAddOwner(null); setAddPlots([]); setAddPlotId(''); setAddSerial(''); setAddType('water'); setAddError(null) }}>
    + Добавить счётчик
  </Button>
</div>
```

Добавить колонку и кнопку в таблицу — заголовок:

```tsx
<th className="px-5 py-2.5"></th>
```

Строка данных — новая `<td>`:

```tsx
<td className="px-5 py-3 text-right">
  <button
    className="text-zinc-400 hover:text-zinc-700 transition-colors"
    title="Редактировать"
    onClick={() => {
      setEditTarget({ id: r.id, meter_type: r.meter_type, serial_number: r.serial_number, is_active: r.is_active })
      setEditForm({ meter_type: r.meter_type, serial_number: r.serial_number, is_active: r.is_active })
      setEditError(null)
    }}
  >
    <Pencil size={14} />
  </button>
</td>
```

- [ ] **Step 7: Добавить диалоги после таблицы**

```tsx
{/* Диалог добавления счётчика */}
<Dialog open={addOpen} onOpenChange={open => { if (!open) setAddOpen(false) }}>
  <DialogContent>
    <DialogHeader><DialogTitle>Добавить счётчик</DialogTitle></DialogHeader>
    <div className="space-y-4 py-2">
      <div className="relative">
        <label className="text-sm text-zinc-600 block mb-1">Владелец</label>
        <Input
          value={addQuery}
          onChange={e => { setAddQuery(e.target.value); setAddOwner(null); searchOwners(e.target.value) }}
          placeholder="Начните вводить ФИО..."
        />
        {addContractors.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-zinc-200 rounded-md shadow mt-1">
            {addContractors.map(c => (
              <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => selectOwner(c)}>
                {c.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {addPlotsLoading && <p className="text-sm text-zinc-400">Загрузка участков...</p>}

      {addOwner && addPlots.length > 1 && (
        <div>
          <label className="text-sm text-zinc-600 block mb-1">Участок</label>
          <select
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
            value={addPlotId}
            onChange={e => setAddPlotId(e.target.value)}
          >
            <option value="">Выберите участок</option>
            {addPlots.map(p => <option key={p.id} value={p.id}>Участок {p.number}</option>)}
          </select>
        </div>
      )}
      {addOwner && addPlots.length === 1 && (
        <p className="text-sm text-zinc-600">Участок: <strong>{addPlots[0].number}</strong> (подставлен автоматически)</p>
      )}

      <div>
        <label className="text-sm text-zinc-600 block mb-1">Тип счётчика</label>
        <select
          className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
          value={addType}
          onChange={e => setAddType(e.target.value)}
        >
          <option value="water">Вода</option>
          <option value="electricity">Электричество</option>
          <option value="gas">Газ</option>
        </select>
      </div>

      <div>
        <label className="text-sm text-zinc-600 block mb-1">Серийный номер</label>
        <Input value={addSerial} onChange={e => setAddSerial(e.target.value)} placeholder="Например: А123456789" />
      </div>

      {addError && <p className="text-red-600 text-sm">{addError}</p>}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
      <Button onClick={saveAdd} disabled={addSaving || !addOwner || !addPlotId}>
        {addSaving ? 'Сохранение...' : 'Добавить'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Диалог редактирования счётчика */}
<Dialog open={editTarget !== null} onOpenChange={open => { if (!open) setEditTarget(null) }}>
  <DialogContent>
    <DialogHeader><DialogTitle>Редактировать счётчик</DialogTitle></DialogHeader>
    <div className="space-y-4 py-2">
      <div>
        <label className="text-sm text-zinc-600 block mb-1">Тип счётчика</label>
        <select
          className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
          value={editForm.meter_type}
          onChange={e => setEditForm(f => ({ ...f, meter_type: e.target.value }))}
        >
          <option value="water">Вода</option>
          <option value="electricity">Электричество</option>
          <option value="gas">Газ</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-zinc-600 block mb-1">Серийный номер</label>
        <Input
          value={editForm.serial_number}
          onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="meter-active" checked={editForm.is_active}
          onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4" />
        <label htmlFor="meter-active" className="text-sm text-zinc-600">Счётчик активен</label>
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
```

- [ ] **Step 8: Проверить TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Собрать и проверить в браузере**

```bash
docker compose build && docker compose up -d
```

Открыть `/meters` → «Добавить счётчик» → ввести «Захарченко» → выбрать → проверить что участок подставился → выбрать тип → серийный → сохранить → счётчик появился.  
Затем кликнуть карандаш в строке → изменить тип → сохранить.

- [ ] **Step 10: Commit**

```bash
git add src/pages/MetersPage.tsx
git commit -m "feat: add meter add/edit dialogs, fix gas type label"
```

---

## Task 6: CounterpartiesPage — контрагенты, фильтр, иконки

**Files:**
- Create: `src/pages/CounterpartiesPage.tsx`

- [ ] **Step 1: Создать CounterpartiesPage.tsx**

```typescript
// src/pages/CounterpartiesPage.tsx
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
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; full_name: string } | null>(null)

  function load() {
    const q = orgParam()
    Promise.all([
      apiFetch<Counterparty[]>(`/contractors?${q}&order=full_name.asc`),
      apiFetch<Balance[]>(`/account_balances?${q}`),
    ]).then(([contractors, balances]) => {
      const bMap = new Map(balances.map(b => [b.contractor_id, b.balance]))
      setRows(contractors.map(c => ({ ...c, balance: bMap.get(c.id) ?? 0 })))
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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
```

- [ ] **Step 2: Проверить TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Собрать и проверить в браузере**

```bash
docker compose build && docker compose up -d
```

Открыть `/counterparties` → проверить табы «Все/Физлица/Юрлица» → проверить иконки у каждой строки → проверить поиск → принять платёж.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CounterpartiesPage.tsx
git commit -m "feat: add CounterpartiesPage with type filter (individual/legal_entity) and icons"
```

---

## Task 7: Журнал операций — переименование и отмена

**Files:**
- Modify: `src/pages/JournalPage.tsx`

- [ ] **Step 1: Добавить импорты**

```typescript
import { cancelDocument } from '../lib/api'
import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
```

- [ ] **Step 2: Добавить состояние для отмены**

После `const [error, ...]` добавить:

```typescript
const [cancelTarget, setCancelTarget] = useState<string | null>(null)
const [cancelLoading, setCancelLoading] = useState(false)
const [cancelError, setCancelError] = useState<string | null>(null)

async function confirmCancel() {
  if (!cancelTarget) return
  setCancelLoading(true)
  setCancelError(null)
  try {
    await cancelDocument(cancelTarget)
    setCancelTarget(null)
    // перезагрузить журнал
    setDocs([])
    setLoading(true)
    apiFetch<JournalItem[]>(`/doc_journal?${orgParam()}&order=doc_date.desc&limit=100`)
      .then(setDocs)
      .catch(e => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  } catch {
    setCancelError('Ошибка отмены операции')
  } finally {
    setCancelLoading(false)
  }
}
```

- [ ] **Step 3: Добавить колонку «Действия» в таблицу**

Заголовок — добавить `<th>`:

```tsx
<th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Действия</th>
```

Строка данных — добавить `<td>` в конец:

```tsx
<td className="px-5 py-3">
  {d.status === 'posted' && (
    <button
      className="text-zinc-400 hover:text-red-600 transition-colors"
      title="Отменить операцию"
      onClick={() => { setCancelTarget(d.id); setCancelError(null) }}
    >
      <Ban size={14} />
    </button>
  )}
</td>
```

- [ ] **Step 4: Обновить заголовок поиска контрагента**

В фильтре `placeholder="Плательщик..."` → `placeholder="Контрагент..."`.

В колонке `<th>` — `Плательщик` → `Контрагент`.

- [ ] **Step 5: Добавить диалог подтверждения отмены**

Перед закрывающим `</div>`:

```tsx
{cancelTarget && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg border border-zinc-200 p-6 max-w-sm w-full mx-4">
      <h3 className="text-sm font-semibold text-zinc-900 mb-2">Отменить операцию?</h3>
      <p className="text-sm text-zinc-500 mb-4">Будут созданы обратные движения. Это действие нельзя отменить.</p>
      {cancelError && <p className="text-red-600 text-sm mb-3">{cancelError}</p>}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelLoading}>
          Нет
        </Button>
        <Button variant="destructive" onClick={confirmCancel} disabled={cancelLoading}>
          {cancelLoading ? 'Отмена...' : 'Отменить операцию'}
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Проверить TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Собрать и проверить в браузере**

```bash
docker compose build && docker compose up -d
```

Открыть `/journal` → убедиться что плейсхолдер фильтра и заголовок колонки изменились → убедиться что кнопка «Отменить» (`Ban` иконка) показывается только для `posted`-операций.

- [ ] **Step 8: Commit**

```bash
git add src/pages/JournalPage.tsx
git commit -m "feat: journal — rename to Операций, add cancel operation with confirm dialog"
```

---

## Task 8: Push

- [ ] **Step 1: Прогнать все тесты**

```bash
npx vitest run
```

Ожидаем: все PASS.

- [ ] **Step 2: TypeScript финальная проверка**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Push**

```bash
git push origin master
```

---

## Self-Review

**Spec coverage:**
- ✅ Дашборд — кликабельные карточки (Task 3)
- ✅ Участки — редактирование number/area/is_active (Task 4)
- ✅ Счётчики — добавление (Task 5) + редактирование (Task 5)
- ✅ Контрагенты — переименование + URL /counterparties + фильтр + иконки (Task 2, 6)
- ✅ Журнал — переименование + отмена (Task 7)
- ✅ Настройки — заглушка (Task 2, 8)
- ✅ API-функции + тесты (Task 1)

**Placeholders:** нет.

**Type consistency:**
- `PlotSummary` — определён в `api.ts` Task 1, используется в Task 5 (`getPlotsByOwner`)
- `Contractor` — уже экспортируется из `api.ts`
- `cancelDocument` — определён Task 1, используется Task 7
- `updatePlot` — определён Task 1, используется Task 4
- `addMeter` / `updateMeter` — определены Task 1, используются Task 5
