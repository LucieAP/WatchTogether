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
        
        // Храним связь между connectionId и userId
        private static readonly ConcurrentDictionary<string, string> _connectionToUserId = new();

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

                // Используем безопасное преобразование строки в Guid
                if (!Guid.TryParse(userId, out Guid parsedUserId))
                {
                    throw new ArgumentException("Неверный формат идентификатора пользователя", nameof(userId));
                }

                // Проверяем существование комнаты
                var room = await _context.Rooms
                    .Include(r => r.Participants)   // Включаем участников комнаты
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .FirstOrDefaultAsync(r => r.RoomId == parsedRoomId, cancellationToken);

                if (room == null)
                {
                    throw new HubException("Комната не найдена");
                }

                // Проверяем существование пользователя в базе данных
                var user = await _context.Users.FindAsync(parsedUserId, cancellationToken);
                if (user == null)
                {
                    _logger.LogWarning("Пользователь с ID {UserId} не найден в базе данных при подключении через SignalR", userId);
                    throw new HubException("Пользователь не найден. Обновите страницу.");
                }

                // Проверяем является ли пользователь участником комнаты
                // Если нет, то добавляем его в комнату
                if (!room.Participants.Any(p => p.UserId == parsedUserId))
                {
                    _logger.LogInformation("Добавляем пользователя {UserId} в комнату {RoomId} через SignalR", userId, roomId);
                    room.Participants.Add(new Participant
                    {
                        UserId = parsedUserId,
                        Role = ParticipantRole.Member,
                        JoinedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync(cancellationToken);
                }

                _connectionRooms[Context.ConnectionId] = roomId;
                
                // Сохраняем связь между connectionId и userId
                _connectionToUserId[Context.ConnectionId] = userId;
                
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

                // TryGetValue - пытается получить значение по ключу. Возвращает `true`, если ключ существует.
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

        // Обновляет время видео в комнате
        public async Task UpdateVideoTime(string roomId, int currentTimeInSeconds)
        {
            try
            {
                _logger.LogInformation("Получен запрос на обновление времени видео в комнате {RoomId}: {CurrentTime} секунд", 
                    roomId, currentTimeInSeconds);

                var cancellationToken = Context.ConnectionAborted;

                // Используем безопасное преобразование строки в Guid
                if (!Guid.TryParse(roomId, out Guid parsedRoomId))
                {
                    _logger.LogWarning("Неверный формат идентификатора комнаты: {RoomId}", roomId);
                    throw new ArgumentException("Неверный формат идентификатора комнаты", nameof(roomId));
                }

                // Получаем идентификатор пользователя из нашего словаря
                if (!_connectionToUserId.TryGetValue(Context.ConnectionId, out var userId))
                {
                    _logger.LogWarning("Пользователь {ConnectionId} не имеет идентификатора пользователя", Context.ConnectionId);
                    throw new HubException("Ваша сессия недействительна. Обновите страницу.");
                }
        
                if (!_connectionRooms.TryGetValue(Context.ConnectionId, out var userRoomId) || userRoomId != roomId)
                {
                    _logger.LogWarning("Пользователь {ConnectionId} не присоединен к комнате {RoomId}", Context.ConnectionId, roomId);
                    throw new HubException("Вы не присоединены к этой комнате");
                }

                // Проверяем права пользователя на управление видео
                if (!await CanUserControlVideo(roomId, userId, cancellationToken))
                {
                    _logger.LogWarning("Пользователь {UserId} не имеет прав на управление видео в комнате {RoomId}", userId, roomId);
                    throw new HubException("В публичной комнате только ведущий может управлять видео");
                }

                // Получаем комнату из базы данных
                var room = await _context.Rooms
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .FirstOrDefaultAsync(r => r.RoomId == parsedRoomId, cancellationToken);

                if (room == null)
                {
                    _logger.LogWarning("Комната {RoomId} не найдена", roomId);
                    throw new HubException("Комната не найдена");
                }

                // Обновляем время видео
                room.VideoState.CurrentTime = TimeSpan.FromSeconds(currentTimeInSeconds);
                room.VideoState.LastUpdated = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                // Отправляем обновление всем клиентам в группе, кроме отправителя
                await Clients.OthersInGroup(roomId).SendAsync("VideoStateUpdated", new
                {
                    CurrentVideoId = room.VideoState?.CurrentVideo?.VideoId,
                    IsPaused = room.VideoState?.IsPaused ?? true,
                    CurrentTime = currentTimeInSeconds,
                    CurrentVideo = room.VideoState?.CurrentVideo
                }, cancellationToken);

                _logger.LogInformation("Время видео в комнате {RoomId} успешно обновлено до {CurrentTime} секунд", 
                    roomId, currentTimeInSeconds);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Операция обновления времени видео в комнате {RoomId} была отменена", roomId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при обновлении времени видео в комнате {RoomId}", roomId);
                throw new HubException($"Ошибка при обновлении времени видео: {ex.Message}");
            }
        }

        // Обновляет состояние паузы в комнате
        public async Task UpdateVideoPauseState(string roomId, bool isPaused)
        {
            try
            {
                _logger.LogInformation("Получен запрос на изменение состояния паузы в комнате {RoomId}: IsPaused = {IsPaused}", 
                    roomId, isPaused);

                var cancellationToken = Context.ConnectionAborted;

                // Используем безопасное преобразование строки в Guid
                if (!Guid.TryParse(roomId, out Guid parsedRoomId))
                {
                    throw new ArgumentException("Неверный формат идентификатора комнаты", nameof(roomId));
                }

                // Получаем идентификатор пользователя из нашего словаря
                if (!_connectionToUserId.TryGetValue(Context.ConnectionId, out var userId))
                {
                    _logger.LogWarning("Пользователь {ConnectionId} не имеет идентификатора пользователя", Context.ConnectionId);
                    throw new HubException("Ваша сессия недействительна. Обновите страницу.");
                }
                
                _logger.LogInformation("Получен запрос на изменение состояния паузы в комнате от пользователя {UserId}: IsPaused = {IsPaused}", 
                    userId, isPaused);
        
                if (!_connectionRooms.TryGetValue(Context.ConnectionId, out var userRoomId) || userRoomId != roomId)
                {
                    _logger.LogWarning("Пользователь {ConnectionId} не присоединен к комнате {RoomId}", Context.ConnectionId, roomId);
                    throw new HubException("Вы не присоединены к этой комнате");
                }

                // Проверяем права пользователя на управление видео
                if (!await CanUserControlVideo(roomId, userId, cancellationToken))
                {
                    _logger.LogWarning("Пользователь {UserId} не имеет прав на управление видео в комнате {RoomId}", userId, roomId);
                    throw new HubException("В публичной комнате только ведущий может управлять видео");
                }

                // Получаем комнату из базы данных
                var room = await _context.Rooms
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .FirstOrDefaultAsync(r => r.RoomId == parsedRoomId, cancellationToken);

                if (room == null)
                {
                    throw new HubException("Комната не найдена");
                }

                // Обновляем состояние паузы
                room.VideoState.IsPaused = isPaused;
                room.VideoState.LastUpdated = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                // Отправляем обновление всем клиентам в группе, кроме отправителя
                await Clients.OthersInGroup(roomId).SendAsync("VideoStateUpdated", new
                {
                    CurrentVideoId = room.VideoState?.CurrentVideo?.VideoId,
                    IsPaused = isPaused,
                    CurrentTime = room.VideoState?.CurrentTime.TotalSeconds ?? 0,
                    CurrentVideo = room.VideoState?.CurrentVideo
                }, cancellationToken);

                _logger.LogInformation("Состояние паузы в комнате {RoomId} успешно обновлено до {IsPaused}", 
                    roomId, isPaused);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Операция обновления состояния паузы в комнате {RoomId} была отменена", roomId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при обновлении состояния паузы в комнате {RoomId}", roomId);
                throw new HubException($"Ошибка при обновлении состояния паузы: {ex.Message}");
            }
        }

        // Проверяет, может ли пользователь управлять видео
        private async Task<bool> CanUserControlVideo(string roomId, string userId, CancellationToken cancellationToken = default)
        {
            // Преобразуем строки в Guid
            if (!Guid.TryParse(roomId, out var parsedRoomId) || !Guid.TryParse(userId, out var parsedUserId))
                return false;

            var room = await _context.Rooms
                .Include(r => r.Participants)
                .FirstOrDefaultAsync(r => r.RoomId == parsedRoomId, cancellationToken);
        
            if (room == null) return false;
        
            // Для приватных комнат - все участники могут управлять видео
            if (room.Status == RoomStatus.Private) return true;
        
            // Для публичных комнат - только ведущий или создатель
            var participant = room.Participants.FirstOrDefault(p => p.UserId == parsedUserId);
            return participant != null && (participant.Role == ParticipantRole.Host || participant.Role == ParticipantRole.Creator);
        }
    }
}
