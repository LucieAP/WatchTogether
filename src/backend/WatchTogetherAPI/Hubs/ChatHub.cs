using Microsoft.AspNetCore.SignalR;

namespace WatchTogetherAPI.Hubs
{
    public class ChatHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(string roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
        }

        public async Task SendMessage(string roomId, string userId, string userName, string message)
        {
            await Clients.Group(roomId).SendAsync("ReceiveMessage", userId, userName, message);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }

    }
}
