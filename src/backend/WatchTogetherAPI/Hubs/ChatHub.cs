using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;


namespace WatchTogetherAPI.Hubs
{
    public class MediaHub : Hub
    {
        // Храним информацию о подключенных комнатах (connectionId → roomId) 
        // Создаем словарь
        private static readonly ConcurrentDictionary<string, string> _connectionRooms  = new();

        // Храним уникальных пользователей в комнате (userId -> roomId)
        private static readonly ConcurrentDictionary<string, string> _userRooms = new();

        // Храним историю сообщений по комнатам (roomId -> msg[])
        private static readonly ConcurrentDictionary<string, List<ChatMessage>> _chatHistory = new();

        // Храним данные видео для синхронизацит (roomId -> class VideoState)
        // private static readonly ConcurrentDictionary<string, VideoState> _roomVideoState = new();

        // Максимальное количество сообщений для хранения в истории комнаты
        private const int MaxHistorySize = 100;

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(string roomId, string userName, string userId)
        {
            _connectionRooms[Context.ConnectionId] = roomId;
            
            // Добавляем подключение в группу
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            
            bool isNewUser = false;

            // TryGetValue - пытается получить значение по ключу. Возвращает `true`, если ключ существует.
            if (!_userRooms.TryGetValue(userId, out var existingRoomId) || existingRoomId!= roomId)
            {
                _userRooms[userId] = roomId;
                isNewUser = true;
            }    

            // Отправляем историю сообщений новому пользователю
            if (_chatHistory.TryGetValue(roomId, out var history))
            {
                await Clients.Caller.SendAsync("ReceiveChatHistory", history);
            }
            else
            {
                // Если истории нет, создаем пустой список
                _chatHistory[roomId] = new List<ChatMessage>();
            }    

            // Уведомляем всех об обновлении списка участников
            await Clients.Group(roomId).SendAsync("ParticipantsUpdated");

            // Отправляем системное сообщение только если это новый пользователь
            if (isNewUser)
            {
                await SendMessage(roomId, "System", userName, "присоединился к чату.");
            }
        }

        public async Task SendMessage(string roomId, string userId, string userName, string message)
        {
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

            await Clients.Group(roomId).SendAsync("ReceiveMessage", userId, userName, message);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_connectionRooms.TryRemove(Context.ConnectionId, out var roomId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                await Clients.Group(roomId).SendAsync("ParticipantsUpdated");
            }

            await base.OnDisconnectedAsync(exception);
        }

    }
}
