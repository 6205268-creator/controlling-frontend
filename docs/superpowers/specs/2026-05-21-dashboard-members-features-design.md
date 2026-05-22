# Spec: Dashboard clickable rows + Members plots

**Date:** 2026-05-21  
**Project:** controlling-frontend  
**Status:** approved

---

## Goal

Two independent frontend improvements:
1. Dashboard "last operations" table rows become clickable — navigate to Journal page filtered by doc_type and date.
2. Members page shows which plots each member owns.

---

## Context

- Stack: React 18 + Vite + TypeScript (strict) + Tailwind + shadcn/ui
- Router: react-router-dom (BrowserRouter)
- API base: `http://103.35.190.117/pg` via `apiFetch` from `src/lib/api.ts`
- Auth helpers: `orgParam()` from `src/lib/api.ts`
- All types defined in `src/lib/api.ts` — do NOT add types inline in page components

---

## Feature 1: Dashboard clickable rows

### Current state

`DashboardPage.tsx` renders a `<table>` of last 20 `JournalItem[]` from `/doc_journal`. Rows are plain `<tr>`, not interactive.

### Desired behavior

- Every row in the "Последние операции" table is clickable.
- Clicking navigates to `/journal?type=<doc_type>&date=<doc_date>`.
- Example: clicking a `payment` row from `2026-05-20` → `/journal?type=payment&date=2026-05-20`.
- On click, `JournalPage` reads those params and pre-applies the filters.

### DashboardPage changes

- Import `useNavigate` from `react-router-dom`.
- Add `const navigate = useNavigate()` inside the component.
- Each `<tr key={d.id}>` gets:
  - `onClick={() => navigate(\`/journal?type=${d.doc_type}&date=${d.doc_date}\`)}`
  - `className` extended with `cursor-pointer hover:bg-zinc-100 transition-colors`
- Existing alternating row background (`bg-white` / `bg-zinc-50/60`) stays — hover overrides it.

### JournalPage changes

- Import `useSearchParams` from `react-router-dom`.
- Add inside the component (before state declarations):
  ```ts
  const [searchParams] = useSearchParams()
  ```
- Change `filterType` initial value: `useState(searchParams.get('type') ?? '')`
- Change `filterDateFrom` initial value: `useState(searchParams.get('date') ?? '')`
- Change `filterDateTo` initial value: `useState(searchParams.get('date') ?? '')`
- Nothing else changes — existing filter logic already handles these states.

---

## Feature 2: Members page — show plots

### Current state

`MembersPage.tsx` loads `members` and `contractors`, joins them, shows a table with columns: № члена, ФИО, Телефон, Дата вступления, Статус. No plot data.

### Desired behavior

Add an "Участки" column showing the plot numbers owned by each member.

### Data model

- `Member.contractor_id` → links member to a contractor
- `PlotSummary.owner_id` → the `contractor_id` of the current owner (from `financial_object_registry` via the `plot_summary` view)
- Match: `plot.owner_id === member.contractor_id`

### MembersPage changes

1. Add `plot_numbers: string[]` to the `MemberRow` interface.
2. Load plot summary in the same `Promise.all`:
   ```ts
   apiFetch<{ id: string; number: string; owner_id: string | null }[]>(
     `/plot_summary?${q}&select=id,number,owner_id`
   )
   ```
3. Build a map: `Map<contractor_id, string[]>` of plot numbers.
4. Populate `plot_numbers` in each `MemberRow` from the map.
5. Add "Участки" column header after "Статус".
6. Render plot numbers as inline chips:
   ```tsx
   {r.plot_numbers.length > 0
     ? r.plot_numbers.map(n => (
         <span key={n} className="inline-block bg-zinc-100 text-zinc-700 rounded px-1.5 py-0.5 text-xs mr-1">
           №{n}
         </span>
       ))
     : <span className="text-zinc-400">—</span>
   }
   ```

### No new API functions needed

`plot_summary` is already a public PostgREST view. Query it directly with `apiFetch`.

---

## What NOT to change

- `src/lib/api.ts` types — `PlotSummary` already has `owner_id: string | null`. Use it as-is with an inline anonymous type in the fetch to avoid importing the full type.
- Docker build/deploy — run after changes: `docker compose build && docker compose up -d`
- Git push: `git push origin master`

---

## Acceptance criteria

1. Clicking any row in the dashboard operations table navigates to `/journal` with `?type` and `?date` pre-filled.
2. JournalPage filter dropdowns show the pre-filled values on arrival.
3. Members table has an "Участки" column populated from `plot_summary`.
4. Members with no owned plots show `—`.
5. TypeScript: `npx tsc --noEmit` → 0 errors.
6. Tests: `npx vitest run` → all pass.
