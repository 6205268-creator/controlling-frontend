# 🎨 FRONTEND SESSION — controlling-frontend

**Ты работаешь ТОЛЬКО с фронтендом.** Бэкенд — другой проект, другой агент.

---

## Запрещено

- Трогать `/home/roman/controlling-backend/` — любые файлы, включая чтение для диагностики
- Менять SQL, PostgREST, миграции
- Коммитить в репо бэкенда (`controlling-api`)
- Писать SQL-файлы куда-либо (migrations/, docs/, /tmp/ — неважно)
- Если проблема упирается в бэкенд (нет RPC, нет прав) — обозначить словами и остановиться. Не лезть самостоятельно.

---

## Скоуп этой сессии

| Что | Где |
|-----|-----|
| Компоненты | `src/components/` |
| Страницы | `src/pages/` |
| API-клиент | `src/lib/api.ts` |
| Авторизация | `src/lib/auth.ts` |
| Сборка | `docker compose build && docker compose up -d` |
| Git | `git push origin master` |

**API Base URL:** `http://103.35.190.117/pg` (только читать, не менять)

---

## Старт каждой сессии

1. Прочитай `FRONTEND_MASTER.md` — стек, экраны, структура
2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` — контейнер жив?
3. `curl http://localhost:3100/rpc/health` — бэкенд жив?
4. Спроси пользователя: что делаем?

---

## Ключевые правила

- Стек: React 18 + Vite + TypeScript (строгий) + Tailwind + shadcn/ui
- После изменений кода: `docker compose build && docker compose up -d`
- Типы — в `src/lib/api.ts`, не разбрасывать по компонентам
- Push: `git push origin master`

---

> Бэкенд: `/home/roman/controlling-backend/CLAUDE.md`
> FRONTEND_MASTER.md — полный справочник
