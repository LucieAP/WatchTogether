using System.ComponentModel.DataAnnotations.Schema;

namespace WatchTogetherAPI.Models
{
    public class Video
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public string? VideoId { get; set; }     // YouTube ID (например, "dQw4w9WgXcQ")

        public int DurationInSeconds { get; set; }

        public string? Title { get; set; }

        // Внешний ключ
        public Guid? RoomId { get; set; }

        // Навигационные свойства
        public virtual Room Room { get; set; }

        // Вычисляемое свойство (не хранится в БД)
        [NotMapped] // Важно: указываем, что это поле не маппится в БД
        public string VideoUrl => $"https://www.youtube.com/watch?v={VideoId}";    // Полная ссылка на видео
    }
}
