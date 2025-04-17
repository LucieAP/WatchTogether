using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Models;
using Microsoft.AspNetCore.Mvc;

namespace WatchTogetherAPI.Hubs
{
    public class MediaHub : Hub
    {
        private readonly AppDbContext _context;
        private readonly ILogger<MediaHub> _logger;
        public MediaHub(AppDbContext context, ILogger<MediaHub> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Храним информацию о подключенных комнатах (connectionId → roomId) 
        // Создаем словарь
        private static readonly ConcurrentDictionary<string, string> _connectionRooms  = new();

        // Храним уникальных пользователей в комнате (userId -> roomId)
        private static readonly ConcurrentDictionary<string, string> _userRooms = new();

        // Храним историю сообщений по комнатам (roomId -> msg[])
        private static readonly ConcurrentDictionary<string, List<ChatMessage>> _chatHistory = new();

        // Максимальное количество сообщений для хранения в истории комнаты
        private const int MaxHistorySize = 100;

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("Клиент подключен: {ConnectionId}", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            try
            {
                _logger.LogInformation("Клиент отключен: {ConnectionId}", Context.ConnectionId);
                
                if (_connectionRooms.TryRemove(Context.ConnectionId, out var roomId))
                {
                    try
                    {
                        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId, Context.ConnectionAborted);
                        await Clients.Group(roomId).SendAsync("ParticipantsUpdated", Context.ConnectionAborted);
                        _logger.LogInformation("Клиент {ConnectionId} удален из комнаты {RoomId}", Context.ConnectionId, roomId);

                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogWarning("Операция отключения клиента {ConnectionId} от комнаты {RoomId} была отменена", Context.ConnectionId, roomId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Ошибка при отключении клиента {ConnectionId} от комнаты {RoomId}", Context.ConnectionId, roomId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Непредвиденная ошибка при отключении клиента {ConnectionId}", Context.ConnectionId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinRoom(string roomId, string userName, string userId)
        {
            try
            {
                _logger.LogInformation("Попытка присоединения к комнате: {RoomId}, пользователь: {UserName} ({UserId})", roomId, userName, userId);

                // Получаем токен отмены из контекста подключения, не используем CancellationToken cancellationToken = default из за несоответствие сигнатур методов между сервером и клиентом.
                var cancellationToken = Context.ConnectionAborted;

                // Используем безопасное преобразование строки в Guid
                if (!Guid.TryParse(roomId, out Guid parsedRoomId))
                {
                    throw new ArgumentException("Неверный формат идентификатора комнаты", nameof(roomId));
                }

                var room = await _context.Rooms
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .FirstOrDefaultAsync(r => r.RoomId == parsedRoomId, cancellationToken);

                if (room == null)
                {
                    throw new HubException("Комната не найдена");
                }

                _connectionRooms[Context.ConnectionId] = roomId;
                
                // Добавляем подключение в группу
                try
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, roomId, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("Операция добавления в группу была отменена: {ConnectionId}, {RoomId}", Context.ConnectionId, roomId);
                    throw; // Перебрасываем исключение для завершения метода
                }
                
                bool isNewUser = false;

                // TryGetValue - пытается получить значение по ключу. Возвращает `true`, если ключ существует.
                if (!_userRooms.TryGetValue(userId, out var existingRoomId) || existingRoomId!= roomId)
                {
                    _userRooms[userId] = roomId;
                    isNewUser = true;
                }    

                // Отправляем историю сообщений новому пользователю
                try
                {
                    if (_chatHistory.TryGetValue(roomId, out var history))
                    {
                        await Clients.Caller.SendAsync("ReceiveChatHistory", history, cancellationToken);
                    }
                    else
                    {
                        // Если истории нет, создаем пустой список
                        _chatHistory[roomId] = new List<ChatMessage>();
                    }

                    // Отправляем текущее состояние видео новому пользователю
                    // await Clients.Caller.SendAsync("InitialVideoState", room.VideoState);

                    await Clients.Caller.SendAsync("InitialVideoState", new {
                        CurrentVideoId = room.VideoState?.CurrentVideo?.VideoId,
                        IsPaused = room.VideoState?.IsPaused ?? true,
                        CurrentTime = room.VideoState?.CurrentTime.TotalSeconds ?? 0,
                        CurrentVideo = room.VideoState?.CurrentVideo // Добавляем объект видео
                    }, cancellationToken);

                    // Уведомляем всех об обновлении списка участников
                    await Clients.Group(roomId).SendAsync("ParticipantsUpdated", cancellationToken);

                    // Отправляем системное сообщение только если это новый пользователь
                    if (isNewUser)
                    {
                        await SendMessage(roomId, "System", userName, "присоединился к чату.");
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("Операция отправки начальных данных была отменена: {ConnectionId}, {RoomId}", Context.ConnectionId, roomId);
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ошибка при отправке начальных данных: {ConnectionId}, {RoomId}", Context.ConnectionId, roomId);
                    throw new HubException("Ошибка при отправке начальных данных");
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Операция JoinRoom была отменена для клиента {ConnectionId}", Context.ConnectionId);
                throw;
            }
            catch (HubException ex)
            {
                // Пробрасываем HubException дальше, так как это наше собственное исключение для клиента
                _logger.LogWarning(ex, "Ошибка при присоединении к комнате: {RoomId}, пользователь: {UserName} ({UserId})", roomId, userName, userId);
                throw; // Перебрасываем исключение для обработки на клиенте
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при присоединении к комнате: {RoomId}, пользователь: {UserName} ({UserId})", roomId, userName, userId);
                throw new HubException($"Ошибка при присоединении к комнате: {ex.Message}");
            }
        }

        public async Task SendMessage(string roomId, string userId, string userName, string message)
        {
            try
            {
                _logger.LogInformation("Отправка сообщения в комнату {RoomId} от пользователя {UserName} ({UserId})", roomId, userName, userId);

                // Получаем токен отмены из контекста подключения, не используем CancellationToken cancellationToken = default из за несоответствие сигнатур методов между сервером и клиентом.
                var cancellationToken = Context.ConnectionAborted;

                // Создаем объект сообщения
                var chatMessage = new ChatMessage
                {
                    UserId = userId,
                    UserName = userName,
                    Message = message,
                    Timestamp = DateTime.UtcNow
                };
                
                // Сохраняем сообщение в истории
                _chatHistory.AddOrUpdate(   // Добавляет или обновляет значение для указанного ключа
                    roomId,
                    new List<ChatMessage> { chatMessage },
                    (key, list) => {
                        list.Add(chatMessage);
                        // Ограничиваем историю
                        if (list.Count > MaxHistorySize)
                        {
                            list.RemoveAt(0);
                        }
                        return list;
                    }
                );

                try
                {
                    await Clients.Group(roomId).SendAsync("ReceiveMessage", userId, userName, message, cancellationToken);
                    _logger.LogInformation("Сообщение успешно отправлено в комнату {RoomId}", roomId);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("Операция отправки сообщения была отменена: {RoomId}", roomId);
                    throw;
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Операция SendMessage была отменена для комнаты {RoomId}", roomId);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при отправке сообщения в комнату {RoomId} от пользователя {UserId}", roomId, userId);
                throw new HubException($"Ошибка при отправке сообщения: {ex.Message}");
            }
        }
    }
}
