using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace WatchTogetherAPI.Hubs
{
    public class ChatHub : Hub
    {
        // Храним информацию о подключенных пользователях
        // Создаем словарь
        private static readonly ConcurrentDictionary<string, string> _connectionRooms  = new();

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(string roomId, string userName)
        {
            _connectionRooms[Context.ConnectionId] = roomId;
            // Добавляем подключение в группу
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Уведомляем всех об обновлении списка участников
            await Clients.Group(roomId).SendAsync("ParticipantsUpdated");

            // Отправляем системное сообщение
            await SendMessage(roomId, "System", userName, "присоединился к чату.");
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
