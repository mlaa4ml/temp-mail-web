# temp-mail-web

Веб-интерфейс для сервиса временной почты [temp-mail-on11](https://github.com/EmailTempMailWorker/temp-mail-on11).

Отдельный проект, который ходит к существующему публичному REST API на `https://api.on11.ru` напрямую с клиента (CORS уже открыт на бэкенде). Никакой собственной бизнес-логики и БД — только UI.

## Возможности

- ✉ Создание временного ящика (случайный логин + выбор домена)
- ✍ Создание ящика с собственным логином (с проверкой занятости через API)
- 📥 Список писем с автообновлением каждые 5 секунд
- 👁 Просмотр письма в HTML (в sandboxed iframe) или текстовом виде
- 📎 Скачивание вложений
- 🗑 Удаление одного письма или полная очистка ящика
- 📋 Копирование адреса в один клик
- 💾 Восстановление последнего использованного ящика между сессиями
- 🌓 Тёмная и светлая темы (по системным настройкам)
- 📱 Мобильный-first интерфейс
- ⚠ Корректная обработка ящиков, арендованных через Telegram-бота (ответ 403)

## Стек

- **React 18** + **TypeScript 5** (strict)
- **Vite 5** (сборка)
- **nginx 1.27 alpine** (production-раздача)
- **Docker** multi-stage build (~30 МБ итоговый образ)

Без UI-китов, без state-management библиотек, без axios/react-query — только нативный `fetch` и `useState`/`useEffect`.

## Структура

```
temp-mail-web/
├── Dockerfile              # multi-stage: node:20-alpine → nginx:1.27-alpine
├── docker-compose.yml      # локальный запуск
├── nginx.conf              # SPA-конфиг с gzip и cache headers
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   ├── client.ts       # тонкая обёртка над fetch (~100 строк)
    │   └── types.ts
    ├── components/
    │   ├── CopyButton.tsx
    │   ├── DomainSelect.tsx
    │   ├── EmailView.tsx
    │   ├── InboxList.tsx
    │   ├── MailboxSetup.tsx
    │   └── Toast.tsx
    ├── hooks/
    │   ├── useDomains.ts
    │   └── useInbox.ts
    ├── styles/
    │   └── global.css
    └── utils/
        ├── random.ts       # генерация случайного логина
        ├── storage.ts      # обёртка над localStorage
        └── time.ts         # форматирование дат и размеров
```

## Локальная разработка

> ⚠ По соглашению с владельцем репозитория локальные тесты/сборка на этой машине не запускаются. Все команды ниже выполняйте на сервере.

```bash
npm install
npm run dev      # dev-сервер на http://localhost:5173
npm run build    # production-сборка в dist/
```

## Сборка и запуск Docker-образа

```bash
# Сборка
docker build -t temp-mail-web .

# Запуск
docker run -d -p 8080:80 --name temp-mail-web --restart unless-stopped temp-mail-web

# Или через compose
docker compose up -d --build
```

После запуска UI будет на `http://localhost:8080`.

## Деплой на Railway

1. Создай новый проект в [Railway](https://railway.app) → **Deploy from GitHub repo** → выбери `temp-mail-web`.
2. Railway сам найдёт `Dockerfile` и начнёт сборку. Порт контейнера (`80`) будет выставлен автоматически.
3. (Опционально) В **Variables** добавь `VITE_API_BASE_URL`, если хочешь ходить не на продовый API. Это нужно указывать **до** сборки, так как Vite подставляет значение на этапе `npm run build`.
4. В **Settings** → **Networking** сгенерируй публичный домен.

## Переменные окружения

| Имя | Описание | По умолчанию |
|---|---|---|
| `VITE_API_BASE_URL` | Базовый URL API temp-mail-on11 | `https://api.on11.ru` |

Переменная считывается **на этапе сборки**. Чтобы её изменить после деплоя, нужно пересобрать образ (например, через `Redeploy` в Railway с новой переменной).

## API, который используется

Полный список endpoint'ов бэкенда — в репозитории [temp-mail-on11](https://github.com/EmailTempMailWorker/temp-mail-on11#api-endpoints). Эта веб-версия использует:

| Метод | Endpoint | Назначение |
|---|---|---|
| GET | `/domains` | Список поддерживаемых доменов |
| GET | `/mailbox/availability` | Проверка доступности собственного логина (`?login=&domain=`) |
| GET | `/emails/{email}` | Список писем (с пагинацией) |
| GET | `/inbox/{id}` | Полное письмо |
| GET | `/inbox/{id}/attachments` | Список вложений письма |
| GET | `/attachments/{id}` | Скачать вложение |
| DELETE | `/emails/{email}` | Удалить все письма ящика |
| DELETE | `/inbox/{id}` | Удалить одно письмо |

## Лицензия

Совпадает с лицензией основного проекта [temp-mail-on11](https://github.com/EmailTempMailWorker/temp-mail-on11).