# Controlling Frontend

Веб-приложение казначея садоводческого товарищества.

## Быстрый старт

```bash
cp .env.example .env
# Отредактировать .env: вписать IP бэкенда
docker compose up -d
```

Приложение открывается на http://localhost:3000

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `VITE_API_BASE_URL` | Base URL бэкенда (PostgREST) | `http://103.35.190.117/pg` |

> `VITE_API_BASE_URL` вшивается при сборке Docker-образа. При смене IP нужно пересобрать: `docker compose build`.

## Переезд на другой сервер

```bash
git clone <repo-url>
cd controlling-frontend
cp .env.example .env       # вписать IP нового бэкенда
docker compose up -d
```

## Тестовые пользователи

| Логин | Пароль | Роль |
|-------|--------|------|
| `demo_a_treasury` | `treasury123` | Казначей (СТ «Демо-А») |
| `demo_a_chair` | `chair123` | Председатель (СТ «Демо-А») |

## Разработка без Docker

```bash
npm install
cp .env.example .env
npm run dev
```

## Стек

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- shadcn/ui
- react-router-dom 6
