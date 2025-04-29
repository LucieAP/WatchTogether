-- Скрипт инициализации базы данных PostgreSQL для WatchTogether

-- Этот SQL-скрипт выполняется при первом запуске контейнера PostgreSQL и необходим для:
-- Создания таблицы __EFMigrationsHistory (была нужна для Docker и не создавалась автоматически)
-- Это специальная таблица, которую Entity Framework Core использует для отслеживания миграций
-- Без неё EF Core не может определить, какие миграции уже применены
-- Именно отсутствие этой таблицы вызывало ошибку relation "__EFMigrationsHistory" does not exist
-- Настройки необходимых расширений PostgreSQL
-- Например, uuid-ossp для работы с UUID как первичными ключами
-- Настройки прав доступа в базе данных
-- Выдача необходимых прав пользователю postgres


-- Проверка и создание таблицы для отслеживания миграций EF Core (если она еще не существует)
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

-- Включаем расширение UUID (в случае, если используется для ключей)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Предоставляем все права пользователю postgres
GRANT ALL PRIVILEGES ON DATABASE "WatchTogetherDb" TO postgres; 