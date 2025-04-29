# Базовый образ с ASP.NET Core Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
# Открываем порты для HTTP и HTTPS
EXPOSE 80
EXPOSE 443

# Образ для сборки приложения
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# Копируем файл проекта для восстановления зависимостей
COPY ["WatchTogetherAPI/WatchTogetherAPI.csproj", "WatchTogetherAPI/"]
# Восстанавливаем зависимости NuGet
RUN dotnet restore "WatchTogetherAPI/WatchTogetherAPI.csproj"
# Копируем все исходные файлы
COPY . .
WORKDIR "/src/WatchTogetherAPI"
# Собираем проект в режиме Release
RUN dotnet build "WatchTogetherAPI.csproj" -c Release -o /app/build

# Образ для публикации приложения
FROM build AS publish
# Публикуем приложение без нативного хоста
RUN dotnet publish "WatchTogetherAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Финальный образ
FROM base AS final
# Установка netcat для wait-for-it.sh
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Копируем опубликованное приложение
COPY --from=publish /app/publish .
# Копируем скрипт ожидания готовности PostgreSQL
COPY wait-for-it.sh /app/wait-for-it.sh
# Делаем скрипт исполняемым
RUN chmod +x /app/wait-for-it.sh

# Точка входа: ожидаем готовности PostgreSQL перед запуском приложения
ENTRYPOINT ["/app/wait-for-it.sh", "postgres", "5432", "dotnet", "WatchTogetherAPI.dll"] 