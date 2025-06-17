# HROpenPlatform

HR платформа с открытым исходным кодом для управления персоналом, включающая видеозвонки, чат, управление резюме и вакансиями.

## 🚀 Быстрый старт

### Запуск системы

```bash
docker compose up
```

Система автоматически поднимет все необходимые сервисы в правильном порядке:

1. 🗃️ **PostgreSQL** - База данных
2. 📦 **MinIO** - Файловое хранилище  
3. 📊 **VictoriaMetrics** - Система сбора метрик
4. 📈 **VMAgent** - Агент сбора метрик
5. 🗄️ **Database Migrations** - Автоматическое создание структуры БД
6. 🚀 **Backend API** - Платформенный сервис
7. 🌐 **Frontend** - React приложение

### Доступ к приложению

После запуска система будет доступна по следующим адресам:

- **🌐 Frontend**: http://localhost:3000
- **🚀 Backend API**: http://localhost:8080
- **📊 VictoriaMetrics**: http://localhost:8430
- **📈 VMAgent**: http://localhost:8429
- **📦 MinIO Console**: http://localhost:9091 (admin/Secure123$)
- **🗃️ PostgreSQL**: localhost:5432

## 🏗️ Архитектура

### Сервисы

- **Frontend** - React приложение с Material-UI
- **Backend** - Go сервис с REST API и WebSocket поддержкой
- **PostgreSQL** - Основная база данных
- **MinIO** - S3-совместимое файловое хранилище
- **VictoriaMetrics** - Система мониторинга и метрик
- **VMAgent** - Агент для сбора метрик

### Возможности

- 💬 **Чат в реальном времени** с WebSocket поддержкой
- 📹 **Видеозвонки** с транскрипцией
- 📄 **Управление резюме** и профилями
- 🏢 **Управление компаниями**
- 💼 **Система вакансий**
- 📊 **Мониторинг и метрики**
- 🔐 **Аутентификация и авторизация**

## 🛠️ Разработка

### Требования

- Docker и Docker Compose
- Порты 3000, 5432, 8080-8081, 8428-8430, 9000-9001, 9090-9091 должны быть свободны

### Структура проекта

```
HROpenPlatform/
├── frontend/              # React приложение
│   ├── src/               # Исходный код
│   ├── Dockerfile         # Docker образ для фронтенда
│   └── nginx.conf         # Конфигурация nginx
├── backend/               # Go backend
│   ├── platform_service/  # Основной сервис
│   ├── migrations/        # SQL миграции
│   └── vmagent-config.yml # Конфигурация VMAgent
├── api/                   # OpenAPI спецификации
└── docker-compose.yml     # Конфигурация Docker Compose
```

### База данных

Система автоматически создает базу данных `hrplatform` и пользователя `backend` при первом запуске. Все миграции применяются автоматически через goose.

### Мониторинг

VictoriaMetrics собирает метрики с backend сервиса. Доступ к графикам метрик через http://localhost:8430

## 🔧 Конфигурация

### Переменные окружения

Основные настройки задаются в `docker-compose.yml`:

- **PostgreSQL**: `postgres/postgres` 
- **MinIO**: `admin/Secure123$`
- **Backend DB**: `backend/your_password`

### Порты

- `3000` - Frontend (nginx)
- `5432` - PostgreSQL
- `8080` - Backend API
- `8081` - Backend WebSocket
- `8428` - VictoriaMetrics
- `8429` - VMAgent
- `9000` - MinIO API
- `9001` - MinIO API (external)
- `9090` - MinIO Console
- `9091` - MinIO Console (external)

## 📝 API

Backend предоставляет REST API и WebSocket endpoints:

- **REST API**: http://localhost:8080
- **WebSocket**: ws://localhost:8081
- **Health Check**: http://localhost:8080/ping

Подробная документация API находится в папке `api/` в формате OpenAPI.

## 🤝 Разработка

Для разработки можно запускать отдельные сервисы:

```bash
# Только база данных и миграции
docker compose up hr-postgres hr-migrations

# База + Backend
docker compose up hr-postgres hr-migrations platform-service

# Вся система
docker compose up
```