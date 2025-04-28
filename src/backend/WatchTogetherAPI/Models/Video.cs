using System.ComponentModel.DataAnnotations.Schema;

namespace WatchTogetherAPI.Models
{
    public class Video
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public string? VideoId { get; set; }     // YouTube ID (например, "dQw4w9WgXcQ") или VK ID в формате "ownerId_videoId" 

        public int DurationInSeconds { get; set; }

        public string? Title { get; set; }
        
        public VideoType VideoType { get; set; } = VideoType.YouTube;

        // Внешний ключ
        public Guid? RoomId { get; set; }

        // Навигационные свойства
        public virtual Room Room { get; set; }

        // Вычисляемое свойство (не хранится в БД)
        [NotMapped] // Важно: указываем, что это поле не маппится в БД
        public string VideoUrl 
        {
            get
            {
                if (string.IsNullOrEmpty(VideoId))
                    return string.Empty;

                // Определяем URL на основе типа видео
                if (VideoType == VideoType.VK)
                {
                    // Для VK видео (формат: ownerId_videoId)
                    if (VideoId.Contains("_") && VideoId.Split('_').Length == 2)
                    {
                        var parts = VideoId.Split('_');
                        var ownerId = parts[0];
                        var videoId = parts[1];
                        return $"https://vk.com/video_ext.php?oid={ownerId}&id={videoId}&hd=2&js_api=1";
                    }
                }
                
                // Для YouTube видео (стандартные 11 символов) или по умолчанию
                return $"https://www.youtube.com/watch?v={VideoId}";
            }
        }
    }
}
