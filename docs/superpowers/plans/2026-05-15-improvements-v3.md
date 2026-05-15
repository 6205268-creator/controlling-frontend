# Improvements v3 — Handoff Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершить редактирование участков, счётчиков и контрагентов — всё заблокировано отсутствием RPC-функций на бэкенде.

**Architecture:** Все записи идут через `POST /rpc/<function>` — прямой PATCH/POST на таблицы/вьюшки запрещён (`authenticated` имеет только SELECT на api-схеме). Фронтенд уже переключён на RPC-эндпоинты. Ждём бэкенд.

**Tech Stack:** React 18 + TypeScript strict + Tailwind + shadcn/ui + lucide-react + PostgREST API

---

## Текущий статус

### Уже сделано (фронт готов, ждёт бэкенд)

| Фича | Фронт | Бэкенд |
|------|-------|--------|
| Редактирование участка (диалог с карандашом) | ✅ готов | ❌ нет `rpc/update_plot` |
| Добавление счётчика (диалог) | ✅ готов | ❌ нет `rpc/create_meter` |
| Редактирование счётчика (диалог) | ✅ готов | ❌ нет `rpc/update_meter` |
| Редактирование контрагента | ❌ не начат | ❌ нет `rpc/update_contractor` |

### Что бэкенд должен добавить

4 RPC-функции в схеме `api`. Паттерн — как `create_payment`, `cancel_document` (SECURITY DEFINER, возвращает JSONB `{ok: bool, error?: text}`). Все требуют `GRANT EXECUTE ... TO authenticated`.

**`api.update_plot(p_org_id UUID, p_plot_id UUID, p_number TEXT, p_area NUMERIC(10,2), p_is_active BOOLEAN)`**
— UPDATE private.plots WHERE id = p_plot_id AND organization_id = p_org_id

**`api.create_meter(p_org_id UUID, p_plot_id UUID, p_meter_type TEXT, p_serial_number TEXT)`**
— INSERT INTO private.meters с is_active = true

**`api.update_meter(p_org_id UUID, p_meter_id UUID, p_meter_type TEXT, p_serial_number TEXT, p_is_active BOOLEAN)`**
— UPDATE private.meters WHERE id = p_meter_id AND organization_id = p_org_id

**`api.update_contractor(p_org_id UUID, p_contractor_id UUID, p_full_name TEXT, p_contractor_type TEXT, p_phone TEXT, p_email TEXT)`**
— UPDATE private.contractors WHERE id = p_contractor_id AND organization_id = p_org_id
— p_phone и p_email могут быть NULL

---

## Задачи для фронтенд-агента

> **ВАЖНО:** Начинать только после того, как бэкенд добавил все 4 RPC-функции и они доступны через `POST /rpc/<name>`.
> Проверка: `curl -X POST http://localhost:3100/rpc/update_plot -H "Content-Type: application/json" -d '{}' -w "\n%{http_code}"` — должно вернуть 400 (ошибка параметров), не 404 и не 403.

---

### Task 1: Проверить, что update_plot / create_meter / update_meter работают

**Files:** `src/lib/api.ts` (уже обновлён), `src/pages/PlotsPage.tsx`, `src/pages/MetersPage.tsx`

- [ ] **Step 1: Проверить curl'ом каждый из трёх эндпоинтов**

```bash
TOKEN="<jwt из localStorage>"
# update_plot
curl -X POST http://localhost:3100/rpc/update_plot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"p_org_id":"<org_id>","p_plot_id":"<plot_id>","p_number":"1","p_area":6.05,"p_is_active":true}'

# create_meter
curl -X POST http://localhost:3100/rpc/create_meter \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"p_org_id":"<org_id>","p_plot_id":"<plot_id>","p_meter_type":"water","p_serial_number":"TEST-001"}'

# update_meter
curl -X POST http://localhost:3100/rpc/update_meter \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"p_org_id":"<org_id>","p_meter_id":"<meter_id>","p_meter_type":"water","p_serial_number":"TEST-001","p_is_active":true}'
```

Ожидаем: `{"ok":true,...}` и HTTP 200.

- [ ] **Step 2: Если работает — фронт уже готов. Собрать и задеплоить**

```bash
npx vitest run
npx tsc --noEmit
docker compose build && docker compose up -d
git push origin master
```

---

### Task 2: Редактирование контрагента

**Files:**
- Modify: `src/pages/CounterpartiesPage.tsx`
- Modify: `src/lib/api.ts`

**Что добавить:**

В каждой строке таблицы контрагентов — кнопка-карандаш (`Pencil` из lucide, как в PlotsPage/MetersPage). По нажатию — диалог редактирования.

**Поля диалога:**

| Поле | Тип | Обязательно |
|------|-----|-------------|
| ФИО / Наименование | text input | да |
| Тип | select: Физлицо / Юрлицо | да |
| Телефон | text input | нет |
| Email | text input | нет |

**API:** `POST /rpc/update_contractor` с телом:
```json
{
  "p_org_id": "<org_id>",
  "p_contractor_id": "<id>",
  "p_full_name": "...",
  "p_contractor_type": "individual" | "legal_entity",
  "p_phone": "..." | null,
  "p_email": "..." | null
}
```

- [ ] **Step 1: Добавить `updateContractor` в api.ts**

```typescript
export async function updateContractor(
  id: string,
  data: { full_name: string; contractor_type: 'individual' | 'legal_entity'; phone: string | null; email: string | null }
): Promise<void> {
  await apiPost<RpcResult>('/rpc/update_contractor', {
    p_org_id:          getOrgId(),
    p_contractor_id:   id,
    p_full_name:       data.full_name,
    p_contractor_type: data.contractor_type,
    p_phone:           data.phone || null,
    p_email:           data.email || null,
  })
}
```

- [ ] **Step 2: Добавить тест в plots-meters-api.test.ts или создать counterparties-api.test.ts**

```typescript
describe('updateContractor', () => {
  it('posts to /rpc/update_contractor with correct params', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true }))
    await updateContractor('ctr-1', { full_name: 'Иванов', contractor_type: 'individual', phone: null, email: null })
    expect(mockFetch.mock.calls[0][0]).toContain('/rpc/update_contractor')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_contractor_id).toBe('ctr-1')
    expect(body.p_full_name).toBe('Иванов')
    expect(body.p_contractor_type).toBe('individual')
  })
})
```

- [ ] **Step 3: Запустить тест, убедиться что проходит**

```bash
npx vitest run
```

- [ ] **Step 4: Добавить диалог редактирования в CounterpartiesPage.tsx**

Добавить state:
```typescript
const [editTarget, setEditTarget] = useState<CounterpartyRow | null>(null)
const [editForm, setEditForm] = useState({ full_name: '', contractor_type: 'individual' as 'individual' | 'legal_entity', phone: '', email: '' })
const [editSaving, setEditSaving] = useState(false)
const [editError, setEditError] = useState<string | null>(null)
```

Функции:
```typescript
function openEdit(r: CounterpartyRow) {
  setEditTarget(r)
  setEditForm({ full_name: r.full_name, contractor_type: r.contractor_type, phone: r.phone ?? '', email: r.email ?? '' })
  setEditError(null)
}

async function saveEdit() {
  if (!editTarget || !editForm.full_name.trim()) { setEditError('Наименование обязательно'); return }
  setEditSaving(true); setEditError(null)
  try {
    await updateContractor(editTarget.id, {
      full_name: editForm.full_name.trim(),
      contractor_type: editForm.contractor_type,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
    })
    setEditTarget(null)
    load()
  } catch { setEditError('Ошибка сохранения') } finally { setEditSaving(false) }
}
```

В строке таблицы, в колонке «Действия» — добавить `Pencil`-кнопку рядом с «Принять платёж»:
```tsx
<button className="text-zinc-400 hover:text-zinc-700 transition-colors" title="Редактировать" onClick={() => openEdit(r)}>
  <Pencil size={14} />
</button>
```

Диалог (shadcn Dialog, как в MetersPage):
```tsx
<Dialog open={editTarget !== null} onOpenChange={open => { if (!open) setEditTarget(null) }}>
  <DialogContent>
    <DialogHeader><DialogTitle>Редактировать контрагента</DialogTitle></DialogHeader>
    <div className="space-y-4 py-2">
      <div>
        <label className="text-sm text-zinc-600 block mb-1">Наименование</label>
        <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
      </div>
      <div>
        <label className="text-sm text-zinc-600 block mb-1">Тип</label>
        <select className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white"
          value={editForm.contractor_type} onChange={e => setEditForm(f => ({ ...f, contractor_type: e.target.value as 'individual' | 'legal_entity' }))}>
          <option value="individual">Физлицо</option>
          <option value="legal_entity">Юрлицо</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-zinc-600 block mb-1">Телефон</label>
        <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+375 29 ..." />
      </div>
      <div>
        <label className="text-sm text-zinc-600 block mb-1">Email</label>
        <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="example@mail.com" />
      </div>
      {editError && <p className="text-red-600 text-sm">{editError}</p>}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setEditTarget(null)}>Отмена</Button>
      <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Сохранение...' : 'Сохранить'}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: tsc + тесты + сборка + push**

```bash
npx tsc --noEmit
npx vitest run
docker compose build && docker compose up -d
git push origin master
```

---

## Правила этой сессии

- Фронтенд только. Бэкенд — другой агент, другая сессия.
- Если что-то не работает из-за бэкенда — обозначить и остановиться. Не читать файлы бэкенда.
- Не писать SQL-файлы никуда.
- После любых изменений кода: `docker compose build && docker compose up -d`
- Тесты перед коммитом: `npx vitest run && npx tsc --noEmit`
