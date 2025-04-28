using System.ComponentModel.DataAnnotations;
using WatchTogetherAPI.Models;

namespace WatchTogetherAPI.Models.DTO
{
    public class UpdateVideoRequest
    {
        
        [Required]
        // [StringLength(11, MinimumLength = 11)]
        public string VideoId { get; set; } // YouTube Video ID (11 символов)

        [Required]
        [StringLength(100)]
        public string Title { get; set; }

        public int DurationInSeconds { get; set; }

        public VideoType VideoType { get; set; }
    }
}
