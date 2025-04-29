# Этап сборки: используем Node.js 18 на базе Alpine Linux для минимального размера образа
FROM node:18-alpine AS build
# Устанавливаем рабочую директорию
WORKDIR /app
# Копируем файлы package.json и package-lock.json для установки зависимостей
COPY package*.json ./
# Устанавливаем зависимости
RUN npm install
# Копируем все файлы проекта в рабочую директорию
COPY . .
# Собираем приложение для продакшена
RUN npm run build

# Этап запуска: используем легковесный образ Nginx на базе Alpine
FROM nginx:alpine AS runtime
# Копируем собранные файлы из этапа сборки в директорию Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Копируем конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Открываем порт 80 для доступа к приложению
EXPOSE 80
# Запускаем Nginx в режиме переднего плана
CMD ["nginx", "-g", "daemon off;"] 