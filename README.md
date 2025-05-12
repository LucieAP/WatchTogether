# WatchTogether

Приложение для совместного просмотра видео и общения в реальном времени. WatchTogether позволяет пользователям создавать виртуальные комнаты для просмотра видеоконтента синхронизированно с друзьями, общаться в чате и управлять воспроизведением.

## Технологический стек

### Backend

- ASP.NET Core 8.0
- Entity Framework Core
- PostgreSQL
- SignalR для реального времени

### Frontend

- React 19
- Vite
- Bootstrap 5
- Axios
- React Router
- SignalR Client

### Инфраструктура

- Docker & Docker Compose
- Nginx

## Требования

Для запуска необходимо установить:

- Docker и Docker Compose
- .NET 8 SDK (для локальной разработки)
- Node.js 18+ (для локальной разработки)

## Запуск в Docker

### Шаг 1: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```
POSTGRES_USER=username
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=database_name
DB_CONNECTION_STRING=Host=username;Port=5432;Database=database_name;Username=username;Password=secure_password
```

### Шаг 2: Запуск приложения

```bash
docker-compose up --build
```

После запуска приложение будет доступно:

- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- PostgreSQL: http://localhost:5432

### Остановка приложения

```bash
docker-compose down
```

Для полной очистки данных (включая базу данных):

```bash
docker-compose down -v
```

## Локальная разработка

### Backend

```bash
cd src/backend/WatchTogetherAPI
dotnet restore
dotnet run
```

### Frontend

```bash
cd src/frontend
npm install
npm run dev
```

## Структура проекта

```
WatchTogether/
│
├── docker-compose.yml       # Основной файл Docker-конфигурации
├── postgres-init/           # Скрипты инициализации PostgreSQL
│   └── init.sql
│
├── src/
│   ├── backend/             # .NET бэкенд
│   │   ├── Dockerfile
│   │   ├── WatchTogetherAPI/
│   │   └── wait-for-it.sh   # Скрипт синхронизации запуска
│   │
│   └── frontend/            # React фронтенд
│       ├── Dockerfile
│       ├── nginx.conf       # Конфигурация Nginx
│       ├── public/
│       └── src/             # Исходный код React
│
└── .gitignore               # Игнорируемые файлы Git
```

## Основные функции

- Создание и вход в комнаты для совместного просмотра
- Синхронизированное воспроизведение видео
- Чат в реальном времени
- Управление пользователями и правами доступа
- Поддержка YouTube плеера

## Лицензия

Данный проект распространяется под лицензией [MIT](https://opensource.org/licenses/MIT).
