using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Models;

namespace WatchTogetherAPI.Services
{
    public class UserCleanupService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<UserCleanupService> _logger;
        private readonly TimeSpan _cleanupInterval;
        private readonly TimeSpan _inactiveThreshold;

        public UserCleanupService(
            IServiceProvider services,
            ILogger<UserCleanupService> logger)
        {
            _services = services;
            _logger = logger;
            _cleanupInterval = TimeSpan.FromHours(24); // Запускать очистку раз в 24 часа
            _inactiveThreshold = TimeSpan.FromDays(7); // Очищать гостевых пользователей, неактивных более 7 дней
        }

        protected override async Task ExecuteAsync(CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Служба очистки неактивных гостевых пользователей запущена.");

            try
            {
                // Бесконечный цикл для очистки неактивных гостевых пользователей 
                // пока не отменена задача
                while (!cancellationToken.IsCancellationRequested)
                {
                    try
                    {
                        await CleanupInactiveGuestUsers(cancellationToken);
                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogInformation("Операция очистки пользователей была отменена.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Ошибка при очистке неактивных гостевых пользователей.");
                    }

                    // Ждем до следующего запуска
                    await Task.Delay(_cleanupInterval, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "Фоновая служба очистки пользователей аварийно завершила работу.");
                throw;
            }
        }

        private async Task CleanupInactiveGuestUsers(CancellationToken cancellationToken = default)
        {
            using var scope = _services.CreateScope(); // Создаем область видимости для сервисов
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>(); // Получаем контекст базы данных
            
            var thresholdDate = DateTime.UtcNow.Subtract(_inactiveThreshold); // Вычисляем дату, которая была неактивной более _inactiveThreshold дней

            // Начинаем транзакцию для обеспечения целостности данных
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // Находим всех неавторизованных гостевых пользователей, созданных более _inactiveThreshold дней назад
                // Также проверяем, что они не создавали комнаты и не участвуют в комнатах
                var inactiveGuestUsers = await context.Users
                    .Include(u => u.CreatedRooms)
                    .Include(u => u.RoomParticipants)
                    .Where(u => u.Status == UserStatus.UnAuthed && 
                        //    u.Username.StartsWith("guest_") &&
                           u.CreatedAt < thresholdDate &&
                           !u.CreatedRooms.Any() &&  // Не создавали комнаты
                           !u.RoomParticipants.Any()) // Не являются участниками комнат
                    .ToListAsync(cancellationToken);

                // Если найдены неактивные гостевые пользователи, то удаляем их
                if (inactiveGuestUsers.Count > 0)
                {
                    _logger.LogInformation($"Найдено {inactiveGuestUsers.Count} неактивных гостевых пользователей для удаления.");

                    // Удаляем найденных пользователей
                    // RemoveRange удаляет коллекцию сущностей за один вызов, что эффективнее,
                    // чем вызывать Remove для каждой сущности по отдельности.
                    // Remove принимает одну сущность, а RemoveRange - коллекцию сущностей.
                    context.Users.RemoveRange(inactiveGuestUsers); 
                    var deleted = await context.SaveChangesAsync(cancellationToken);
                    
                    _logger.LogInformation($"Удалено {deleted} неактивных гостевых пользователей.");
                    
                    // Фиксируем изменения
                    await transaction.CommitAsync(cancellationToken);
                }
                else
                {
                    _logger.LogInformation("Не найдено неактивных гостевых пользователей для удаления.");
                    // Отменяем транзакцию, так как нечего удалять
                    await transaction.RollbackAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при удалении неактивных гостевых пользователей. Транзакция отменена.");
                // В случае ошибки отменяем транзакцию
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
} 