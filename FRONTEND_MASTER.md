# Controlling Frontend — MASTER DOCUMENT

> Главный документ фронтенда. Новая сессия начинает отсюда.
> Последнее обновление: 2026-05-11

---

## Что это

Веб-приложение казначея садоводческого товарищества.  
SPA на React 18 + Vite + Tailwind + shadcn/ui.  
Подключается к бэкенду PostgREST на `http://103.35.190.117/pg`.

**Бэкенд находится в ДРУГОМ проекте:** `/home/roman/dev-context/` — не смешивать.

---

## Статус: MVP ГОТОВ ✅

Дата сборки: 2026-05-11  
Docker-контейнер запущен на порту 3000: `http://103.35.190.117:3000`

---

## Структура

```
/home/roman/controlling-frontend/
├── src/
│   ├── lib/
│   │   ├── auth.ts          — JWT localStorage helpers
│   │   └── api.ts           — apiFetch, apiPost, orgParam
│   ├── components/
│   │   ├── Layout.tsx       — Sidebar + topbar + Outlet
│   │   └── Sidebar.tsx      — сворачиваемый сайдбар
│   └── pages/
│       ├── LoginPage.tsx    — авторизация
│       ├── DashboardPage.tsx — дашборд
│       ├── PlotsPage.tsx    — участки
│       ├── MembersPage.tsx  — члены СТ
│       ├── MetersPage.tsx   — счётчики
│       └── ContractorsPage.tsx — плательщики
├── Dockerfile               — node:20-alpine build → nginx:alpine
├── docker-compose.yml       — порт 3000
├── nginx.conf               — SPA fallback + gzip
├── .env.example             — VITE_API_BASE_URL=http://103.35.190.117/pg
└── README.md                — инструкция для новых разработчиков
```

---

## Запуск

```bash
# Запустить (уже запущен)
cd /home/roman/controlling-frontend
docker compose up -d

# Остановить
docker compose down

# Пересобрать после изменений кода
docker compose build && docker compose up -d

# Разработка без Docker (горячая перезагрузка)
npm run dev   # → http://localhost:5173
```

**Порт:** 3000 (снаружи: http://103.35.190.117:3000)

---

## Стек

| Пакет | Версия | Роль |
|-------|--------|------|
| React | 18 | UI |
| Vite | 5 | сборка |
| TypeScript | строгий режим | типы |
| Tailwind CSS | 3 | стили |
| shadcn/ui | base-nova стиль | компоненты (Button, Input, Badge) |
| @base-ui/react | 1.4.x | headless-примитивы под shadcn |
| react-router-dom | 7 | роутинг |
| lucide-react | icons | иконки |
| vitest | 1.x | тесты |

---

## Авторизация

- JWT хранится в `localStorage`: `controlling_token`, `controlling_org_id`, `controlling_role`, `controlling_name`
- При 401 — автоматический редирект на `/login`
- Все API-запросы добавляют `Authorization: Bearer <token>`
- `orgParam()` возвращает `organization_id=eq.<uuid>` для фильтрации данных по организации

---

## Экраны

| Маршрут | Страница | API |
|---------|----------|-----|
| `/login` | Логин | POST /rpc/login, POST /rpc/me |
| `/` | Дашборд | /doc_journal, /plot_summary, /contractors, /object_debts |
| `/plots` | Участки | /plot_summary |
| `/members` | Члены СТ | /members + /contractors (join) |
| `/meters` | Счётчики | /meters + /plots (join) |
| `/contractors` | Плательщики | /contractors + /account_balances (join) |

---

## Тестовые пользователи

| Логин | Пароль | Роль |
|-------|--------|------|
| `demo_a_treasury` | `treasury123` | Казначей, СТ «Демо-А» |
| `demo_a_chair` | `chair123` | Председатель, СТ «Демо-А» |

---

## Git

```bash
git log --oneline    # 12 коммитов, всё от 2026-05-11
```

**Удалённого репо нет** — нужно создать на GitHub и добавить remote:
```bash
git remote add origin https://github.com/6205268-creator/controlling-frontend.git
git push -u origin main
```

---

## Документы

| Файл | Расположение |
|------|-------------|
| Спек (дизайн) | `/home/roman/dev-context/docs/superpowers/specs/2026-05-11-controlling-frontend-design.md` |
| План реализации | `/home/roman/dev-context/docs/superpowers/plans/2026-05-11-controlling-frontend.md` |

---

## Что дальше (следующий этап)

1. **Создать GitHub репо** для фронтенда и запушить
2. **Принять платёж** — форма: выбрать плательщика, сумма, дата, ЕРИП-референс → POST /rpc/create_payment + /rpc/post_payment
3. **Должники** — страница /debtors из view `debtors`
4. **Журнал документов** — отдельная страница с фильтрами
5. **Улучшить дашборд** — добавить quick-action кнопку "Принять платёж"

---

## Для следующей сессии Claude

1. Прочитай этот файл
2. Проверь что контейнер жив: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
3. Проверь бэкенд: `curl http://localhost:3100/rpc/health`
4. **НЕ СМЕШИВАЙ** фронтенд (`/home/roman/controlling-frontend`) и бэкенд (`/home/roman/dev-context`)
5. Спроси пользователя что делаем
