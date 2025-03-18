using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;


namespace WatchTogetherAPI.Hubs
{
    public class ChatHub : Hub
    {
        // Храним информацию о подключенных пользователях
        // Создаем словарь
        private static readonly ConcurrentDictionary<string, string> _connectionRooms  = new();

        // Храним уникальных пользователей в комнате (userId -> roomId)
        private static readonly ConcurrentDictionary<string, string> _userRooms = new();

        // Храним историю сообщений по комнатам
        private static readonly ConcurrentDictionary<string, List<ChatMessage>> _chatHistory = new();

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
            _chatHistory.AddOrUpdate(
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

        // Метод для очистки истории чата комнаты (опционально)
        public async Task ClearChatHistory(string roomId, string userId)
        {
            // Проверяем полномочия (например, админ комнаты)
            // Здесь можно добавить логику проверки прав
            
            if (_chatHistory.TryGetValue(roomId, out _))
            {
                _chatHistory[roomId] = new List<ChatMessage>();
                await Clients.Group(roomId).SendAsync("ChatHistoryCleared");
                await SendMessage(roomId, "System", "System", "История чата была очищена.");
            }
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
