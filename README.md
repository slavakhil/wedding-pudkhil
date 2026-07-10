# Wedding Pudkhil

Одностраничное свадебное приглашение с админ-панелью, сервером, PostgreSQL и Docker Compose.

## Локальный запуск

```bash
npm install
npm run dev:server
npm run dev:client
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Стартовые данные через Docker запускаются отдельно и не перезаписываются при обычном рестарте:

```bash
npm run docker:seed
```

После запуска:

- лендинг: `http://localhost:5173/invite/demo-family`
- админ-панель: `http://localhost:5173/admin`
- API: `http://localhost:4000/api/health`

Ключ админ-панели задается в `.env` через `ADMIN_ACCESS_CODE`.

## Деплой на VPS

Production-инструкция для Ubuntu VPS с уже настроенным доменом и SSL лежит в [DEPLOY.md](./DEPLOY.md).
