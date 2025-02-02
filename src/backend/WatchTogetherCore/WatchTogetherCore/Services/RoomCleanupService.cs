using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using WatchTogetherCore.Data.AppDbContext;

namespace WatchTogetherCore.Services
{
    public class RoomCleanupService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<RoomCleanupService> _logger;

        public RoomCleanupService(
            IServiceProvider services,
            ILogger<RoomCleanupService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Room Cleanup Service is starting.");

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        using var scope = _services.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        var now = DateTime.UtcNow;
                        var expiredRooms = await context.Rooms
                            .Where(r => r.ExpiresAt < now)
                            .ToListAsync(cancellationToken: stoppingToken); // Добавляем токен

                        if (expiredRooms.Count > 0)
                        {
                            _logger.LogInformation($"Deleting {expiredRooms.Count} expired rooms...");
                            context.Rooms.RemoveRange(expiredRooms);
                            await context.SaveChangesAsync(stoppingToken); // Передаем токен
                            _logger.LogInformation($"Deleted {expiredRooms.Count} rooms");
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Игнорируем, если это запрошенная отмена
                        _logger.LogInformation("Cleanup operation was canceled");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error cleaning rooms");
                    }

                    await Task.Delay(TimeSpan.FromMinutes(60), stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "Background service crashed");
                throw;
            }
        }
    }
}