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
