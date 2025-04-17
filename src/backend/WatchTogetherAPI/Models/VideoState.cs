using System;

namespace WatchTogetherAPI.Models
{
    public class VideoState
    {
        // Текущее видео
        public Guid? CurrentVideoId { get; set; }  // Явное свойство для внешнего ключа
        public bool IsPaused { get; set; } = true;
        public TimeSpan CurrentTime { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        public virtual Video CurrentVideo { get; set; }
    }
}