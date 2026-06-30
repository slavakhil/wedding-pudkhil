## Запуск проекта

Перейти в папку проекта на VPS:

```bash
cd /opt/wedding-pudkhil
```

Запустить приложение с пересборкой:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Проверить контейнеры:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Проверить приложение локально на сервере:

```bash
curl -I http://127.0.0.1:8080/
curl http://127.0.0.1:8080/api/health
```

Посмотреть логи сервера:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100 server
```

Перезапустить приложение без пересборки:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart
```

## Обновление кода без удаления базы

База данных и загруженные файлы хранятся в Docker volumes. Они сохраняются при пересборке через `up -d --build`.

На локальном Mac из папки проекта создать свежий архив:

```bash
cd /Users/slavjx/Documents/work/projects/wedding-pudkhil
tar --exclude=node_modules --exclude='client/node_modules' --exclude='server/node_modules' --exclude='client/dist' --exclude='server/dist' --exclude='.git' --exclude='.qa' -czf wedding-pudkhil.tar.gz .
```

Загрузить архив на VPS:

```bash
scp wedding-pudkhil.tar.gz ubuntu@185.65.200.193:/tmp/
```

На VPS распаковать код поверх текущей версии:

```bash
cd /opt/wedding-pudkhil
tar -xzf /tmp/wedding-pudkhil.tar.gz -C /opt/wedding-pudkhil
```

Пересобрать и запустить контейнеры:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Проверить состояние:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
curl -I http://127.0.0.1:8080/
curl http://127.0.0.1:8080/api/health
```

Если что-то пошло не так, посмотреть логи:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100 server
```

Не запускать эту команду, если нужно сохранить базу и загруженные файлы:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

## Бэкапы

### Сделать бэкап

```bash
cd /opt/wedding-pudkhil
mkdir -p backups
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_dump -U wedding -d wedding -Fc > backups/wedding-$(date +%Y-%m-%d_%H-%M-%S).dump
```

Скачать бэкап на локальный Mac:

```bash
scp ubuntu@185.65.200.193:/opt/wedding-pudkhil/backups/*.dump ~/Downloads/
```

### Загрузить dump

Если файл находится локально на Mac:

```bash
scp ~/Downloads/wedding-2026-06-30_20-00-00.dump ubuntu@185.65.200.193:/opt/wedding-pudkhil/backups/
```

На VPS:

```bash
cd /opt/wedding-pudkhil
```

Восстановить dump:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_restore -U wedding -d wedding --clean --if-exists --no-owner < backups/wedding-2026-06-30_20-00-00.dump
```

Лучше сначала остановить сервер приложения:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production stop server
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_restore -U wedding -d wedding --clean --if-exists --no-owner < backups/wedding-2026-06-30_20-00-00.dump
docker compose -f docker-compose.prod.yml --env-file .env.production start server
```

Проверить после восстановления:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=80 server
```

## Удалить файлы из базы

Удаление изображений и записей из админки.

```bash
cd /opt/wedding-pudkhil
```

Сначала сделать бэкап на всякий случай:

```bash
mkdir -p backups
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_dump -U wedding -d wedding -Fc > backups/wedding-before-uploads-clean-$(date +%Y-%m-%d_%H-%M-%S).dump
```

Посмотреть, что будет удаляться:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U wedding -d wedding -c 'SELECT id, key, url FROM "MediaAsset";'
```

Удалить image-контент из `SiteContent`, если он есть в админке:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U wedding -d wedding -c 'DELETE FROM "SiteContent" WHERE type = '\''image'\'';'
```

Удалить физические файлы:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec server sh -c 'find /app/uploads -type f -delete'
docker compose -f docker-compose.prod.yml --env-file .env.production exec server sh -c 'find /app/uploads -mindepth 1 -type d -empty -delete'
```

Перезапустить сервер приложения:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart server
```

Проверить:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U wedding -d wedding -c 'SELECT COUNT(*) FROM "MediaAsset";'
docker compose -f docker-compose.prod.yml --env-file .env.production exec server find /app/uploads -maxdepth 2 -type f
```
