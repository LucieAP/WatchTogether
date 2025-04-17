
namespace WatchTogetherAPI.Hubs
{
    public class ChatMessage
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
        public string MessageId { get; set; } = Guid.NewGuid().ToString();
    }
}
