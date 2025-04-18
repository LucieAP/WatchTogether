using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace WatchTogetherAPI.Services
{
    public class RoomCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory; // для создания областей в которых будет работать сервис
        private readonly ILogger<RoomCleanupService> _logger;
        private readonly IHubContext<MediaHub> _hubContext;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(10); // Проверка каждые 10 минут

        public RoomCleanupService(
            IServiceScopeFactory scopeFactory,
            ILogger<RoomCleanupService> logger,
            IHubContext<MediaHub> hubContext)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Служба очистки комнат запущена");

            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredRoomsAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ошибка при очистке просроченных комнат");
                }

                await Task.Delay(_checkInterval, cancellationToken);
            }
        }

        private async Task CleanupExpiredRoomsAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Начало проверки просроченных комнат");

            using var scope = _scopeFactory.CreateScope();  // создаёт область в которой будет работать сервис
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>(); // получаем контекст базы данных

            // Получаем текущее время в UTC
            var utcNow = DateTime.UtcNow;

            // Находим все просроченные комнаты
            var expiredRooms = await dbContext.Rooms
                .Include(r => r.Participants)
                .Where(r => r.ExpiresAt < utcNow)
                .ToListAsync(cancellationToken);

            if (!expiredRooms.Any())
            {
                _logger.LogInformation("Просроченных комнат не найдено");
                return;
            }

            _logger.LogInformation("Найдено {Count} просроченных комнат", expiredRooms.Count);

            foreach (var room in expiredRooms)
            {
                try
                {
                    // // Уведомляем всех участников о закрытии комнаты
                    // await _hubContext.Clients.Group(room.RoomId.ToString())
                    //     .SendAsync("RoomClosed", "Комната была автоматически закрыта по истечении срока действия", cancellationToken);

                    // Удаляем всех участников комнаты
                    dbContext.Participants.RemoveRange(room.Participants);
                    
                    // Удаляем комнату
                    dbContext.Rooms.Remove(room);
                    
                    _logger.LogInformation("Комната {RoomId} удалена по истечении срока действия", room.RoomId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ошибка при удалении просроченной комнаты {RoomId}", room.RoomId);
                }
            }

            // Сохраняем изменения в базе данных
            await dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Завершено удаление {Count} просроченных комнат", expiredRooms.Count);
        }
    }
}