# Plan: Dashboard clickable rows + Members plots

**Spec:** `docs/superpowers/specs/2026-05-21-dashboard-members-features-design.md`  
**Date:** 2026-05-21  
**Project:** `/home/roman/controlling-frontend`

---

## Context for the executing agent

You are working ONLY in the frontend project at `/home/roman/controlling-frontend`.

**FORBIDDEN:**
- Reading or modifying anything in `/home/roman/controlling-backend/`
- Writing SQL files anywhere
- Changing API base URL or PostgREST config

**Stack:** React 18 + Vite + TypeScript (strict) + Tailwind + shadcn/ui + react-router-dom  
**API base:** `http://103.35.190.117/pg`  
**After every code change:** `docker compose build && docker compose up -d`  
**After all tasks done:** `git push origin master`

---

## Tasks

### Task 1: Dashboard rows → navigate to journal with type + date filter

**File:** `src/pages/DashboardPage.tsx`

- [ ] **Step 1.1** — Read the current file: `src/pages/DashboardPage.tsx`

- [ ] **Step 1.2** — Add `useNavigate` import from `react-router-dom`.  
  Current import line 2: `import { Link } from 'react-router-dom'`  
  Change to: `import { Link, useNavigate } from 'react-router-dom'`

- [ ] **Step 1.3** — Add `const navigate = useNavigate()` inside `DashboardPage` component, right after `const [paymentOpen, setPaymentOpen] = useState(false)`.

- [ ] **Step 1.4** — Modify each `<tr>` in the operations table (currently line ~87):  
  **Before:**
  ```tsx
  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
  ```
  **After:**
  ```tsx
  <tr
    key={d.id}
    className={`${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'} cursor-pointer hover:bg-zinc-100 transition-colors`}
    onClick={() => navigate(`/journal?type=${d.doc_type}&date=${d.doc_date}`)}
  >
  ```

- [ ] **Step 1.5** — Acceptance check:
  - `npx tsc --noEmit` → 0 errors
  - Clicking a row in the browser should navigate to `/journal?type=...&date=...`

---

### Task 2: JournalPage reads URL params for pre-filtering

**File:** `src/pages/JournalPage.tsx`

- [ ] **Step 2.1** — Read the current file: `src/pages/JournalPage.tsx`

- [ ] **Step 2.2** — Add `useSearchParams` to the react-router-dom import.  
  Find the existing import (should already have some react-router-dom imports or none).  
  Add/extend to include `useSearchParams`:
  ```ts
  import { useNavigate, useSearchParams } from 'react-router-dom'
  ```
  _(Check what's already imported from react-router-dom in JournalPage and extend it, don't duplicate)_

- [ ] **Step 2.3** — Inside `JournalPage` component, add before the state declarations:
  ```ts
  const [searchParams] = useSearchParams()
  ```

- [ ] **Step 2.4** — Change the three filter state initializers to read from URL params:
  ```ts
  const [filterType, setFilterType] = useState(searchParams.get('type') ?? '')
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get('date') ?? '')
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get('date') ?? '')
  ```
  _(Find the existing `useState('')` declarations for these three and update only the initial values)_

- [ ] **Step 2.5** — Acceptance check:
  - `npx tsc --noEmit` → 0 errors
  - Navigate from dashboard → journal; the type and date filters should be pre-filled in the journal UI

---

### Task 3: Members page — show plots column

**File:** `src/pages/MembersPage.tsx`

- [ ] **Step 3.1** — Read the current file: `src/pages/MembersPage.tsx`

- [ ] **Step 3.2** — Add `plot_numbers: string[]` to the `MemberRow` interface:
  ```ts
  interface MemberRow {
    id: string
    member_number: string
    full_name: string
    phone: string | null
    joined_at: string
    is_active: boolean
    plot_numbers: string[]   // ← add this
  }
  ```

- [ ] **Step 3.3** — Add a third request to the existing `Promise.all` inside `useEffect`:
  ```ts
  apiFetch<{ id: string; number: string; owner_id: string | null }[]>(
    `/plot_summary?${q}&select=id,number,owner_id`
  )
  ```
  The full Promise.all becomes:
  ```ts
  Promise.all([
    apiFetch<Member[]>(`/members?${q}&order=member_number.asc`),
    apiFetch<Contractor[]>(`/contractors?${q}&select=id,full_name,phone`),
    apiFetch<{ id: string; number: string; owner_id: string | null }[]>(
      `/plot_summary?${q}&select=id,number,owner_id`
    ),
  ]).then(([members, contractors, plots]) => {
  ```

- [ ] **Step 3.4** — Inside the `.then(([members, contractors, plots]) => {` callback, build a plot map before building rows:
  ```ts
  const plotMap = new Map<string, string[]>()
  for (const p of plots) {
    if (!p.owner_id) continue
    const existing = plotMap.get(p.owner_id) ?? []
    existing.push(p.number)
    plotMap.set(p.owner_id, existing)
  }
  ```

- [ ] **Step 3.5** — In the `members.map(m => ...)` call, add `plot_numbers` to each row:
  ```ts
  return {
    id: m.id,
    member_number: m.member_number,
    full_name: c?.full_name ?? '—',
    phone: c?.phone ?? null,
    joined_at: m.joined_at,
    is_active: m.is_active,
    plot_numbers: plotMap.get(m.contractor_id) ?? [],  // ← add this
  }
  ```

- [ ] **Step 3.6** — Add "Участки" column header to `<thead>` after the "Статус" `<th>`:
  ```tsx
  <th className="text-left px-5 py-2.5 text-xs text-zinc-400 font-medium uppercase tracking-wide">Участки</th>
  ```

- [ ] **Step 3.7** — Add the "Участки" cell to each `<tr>` in `<tbody>` after the "Статус" `<td>`:
  ```tsx
  <td className="px-5 py-3">
    {r.plot_numbers.length > 0
      ? r.plot_numbers.map(n => (
          <span key={n} className="inline-block bg-zinc-100 text-zinc-700 rounded px-1.5 py-0.5 text-xs mr-1">
            №{n}
          </span>
        ))
      : <span className="text-zinc-400">—</span>
    }
  </td>
  ```

- [ ] **Step 3.8** — Update `colSpan` in the empty-state row from `5` to `6`:
  ```tsx
  <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-400">Ничего не найдено</td></tr>
  ```

- [ ] **Step 3.9** — Acceptance check:
  - `npx tsc --noEmit` → 0 errors
  - Members table shows "Участки" column with plot number chips or `—`

---

### Task 4: Build, verify, commit, push

- [ ] **Step 4.1** — Run full verification:
  ```bash
  npx tsc --noEmit
  npx vitest run
  ```
  Both must pass with 0 errors.

- [ ] **Step 4.2** — Build and deploy:
  ```bash
  docker compose build && docker compose up -d
  ```

- [ ] **Step 4.3** — Commit:
  ```bash
  git add src/pages/DashboardPage.tsx src/pages/JournalPage.tsx src/pages/MembersPage.tsx
  git commit -m "feat: dashboard rows navigate to journal; members show owned plots"
  ```

- [ ] **Step 4.4** — Push:
  ```bash
  git push origin master
  ```

---

## Definition of done

- [ ] Dashboard rows clickable, navigate to `/journal?type=X&date=Y`
- [ ] Journal opens with type and date pre-filtered
- [ ] Members table has "Участки" column with plot numbers
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vitest run` → all tests pass
- [ ] Docker running with new build
- [ ] Pushed to master
