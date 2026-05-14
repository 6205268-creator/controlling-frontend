# Design: Payment, Debtors, Journal, Dashboard Button

**Date:** 2026-05-14  
**Project:** controlling-frontend  
**Status:** Approved

---

## Context

MVP is live with 6 screens: Login, Dashboard, Plots, Members, Meters, Contractors.  
This spec covers the next 4 features for the gardening association treasurer.

---

## Features in Scope

1. **PaymentDialog** — modal to accept a payment
2. **DebtorsPage** — `/debtors` page showing who owes what and for what
3. **JournalPage** — `/journal` page with all documents and filters
4. **Dashboard quick-action** — "Принять платёж" button on the dashboard

---

## Architecture

**Approach:** each feature standalone, following existing patterns (OwnershipDialog, PlotsPage, etc.). No shared component extraction now — refactor later if needed.

### New files

| File | Purpose |
|------|---------|
| `src/components/PaymentDialog.tsx` | Payment modal (mirrors OwnershipDialog pattern) |
| `src/pages/DebtorsPage.tsx` | Debtor cards page |
| `src/pages/JournalPage.tsx` | Document journal with filters |

### Modified files

| File | Change |
|------|--------|
| `src/lib/api.ts` | + `createPayment()`, `postPayment()`, `PaymentParams`, `DebtorItem` types |
| `src/App.tsx` | + routes `/debtors`, `/journal` |
| `src/components/Sidebar.tsx` | + links Должники, Журнал |
| `src/pages/DashboardPage.tsx` | + "Принять платёж" button → PaymentDialog (no preselection) |
| `src/pages/ContractorsPage.tsx` | + "Принять платёж" button per row → PaymentDialog (preselectedContractor) |

---

## Feature 1: PaymentDialog

**Component:** `src/components/PaymentDialog.tsx`

**Props:**
```ts
interface Props {
  open: boolean
  onClose: () => void
  onPosted: () => void
  preselectedContractor?: { id: string; full_name: string } | null
}
```

**Fields:**
- Плательщик — text search input using existing `searchContractors()` API. If `preselectedContractor` provided, pre-filled and editable.
- Сумма (BYN) — number input, required, > 0
- Дата — date input, default today, required
- ЕРИП-референс — text input, **optional**, no validation

**Flow:**
1. User fills form → clicks "Провести платёж"
2. POST `/rpc/create_payment` → get `doc_id`
3. POST `/rpc/post_payment` with `doc_id`
4. On success: close dialog + call `onPosted()` (triggers data reload in parent)
5. On error: show inline error message, keep dialog open

**Triggers:**
- DashboardPage: "Принять платёж" button in page header (no preselection)
- ContractorsPage: "Принять платёж" button on each contractor row (preselectedContractor set)

---

## Feature 2: DebtorsPage

**Route:** `/debtors`  
**Component:** `src/pages/DebtorsPage.tsx`

**Data:** `GET /debtors?{orgParam()}` — view on backend

**Layout:** Cards (not table). One card per debtor.

**Card content:**
- Header: full name (bold) + phone number
- Right side: total debt amount in red (e.g. "−100 BYN")
- Tags row: breakdown by debt type — each type as a red badge (e.g. "Членский взнос: 70 BYN", "Электричество: 15 BYN")

**Header:** summary line — "N должников · общий долг −X BYN"

**No filters for MVP** — number of debtors in a small СТ is manageable.

**Future:** "Отправить уведомление" button per card (SMS/email) — out of scope now.

**Required backend:** `debtors` view must return per-debtor debt breakdown by type. If view only returns totals, backend change needed — flag this during implementation.

---

## Feature 3: JournalPage

**Route:** `/journal`  
**Component:** `src/pages/JournalPage.tsx`

**Data:** `GET /doc_journal?{orgParam()}&order=doc_date.desc&limit=100`

**Filters (client-side on the 100 loaded records):**
- Тип — dropdown (Все / Платёж / Начисление / Распределение / Показание счётчика / Начисление по счётчику / Закрытие периода / Корректировка счётчика)
- Статус — dropdown (Все / Черновик / Проведён / Отменён)
- Дата с / Дата по — date inputs
- Плательщик — text search (filters by `contractor_name`)

**Table columns:** Дата · Тип · Плательщик · Сумма · Статус  
Same visual pattern as DashboardPage operations table.

**Pagination:** none for MVP. Add later if needed.

---

## Feature 4: Dashboard Quick-Action

Add button to `DashboardPage` header row:

```
[Дашборд title]          [+ Принять платёж]  ← new button
```

Opens `PaymentDialog` with no preselection. After posting, reloads dashboard data.

---

## API additions (`src/lib/api.ts`)

```ts
export interface PaymentParams {
  orgId: string
  contractorId: string
  amount: number
  docDate: string       // YYYY-MM-DD
  eripRef?: string      // optional
}

export async function createPayment(params: PaymentParams): Promise<RpcResult>
export async function postPayment(docId: string): Promise<RpcResult>

export interface DebtBreakdown {
  debt_type: string
  amount: number
}

export interface DebtorItem {
  contractor_id: string
  full_name: string
  phone: string | null
  total_debt: number
  breakdown: DebtBreakdown[]  // may need separate query if view doesn't return nested
}
```

---

## Technical Debt

| Item | Notes |
|------|-------|
| ERIP reference validation | Field exists, no validation. Add later when ERIP integration is built. |
| ContractorSearchInput | Duplicated search logic in PaymentDialog and OwnershipDialog. Extract to shared component in a future refactor. |
| Debtor notification | "Отправить уведомление" button (SMS/email) per debtor card — future feature. |
| Journal pagination | Add paginated navigation when СТ grows and 100 records is not enough. |

---

## Out of Scope

- Backend changes (except if `debtors` view needs breakdown — flag during implementation)
- Payment cancellation / editing
- Accrual creation
- Member management forms
