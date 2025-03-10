using System.ComponentModel.DataAnnotations;

namespace WatchTogetherAPI.Models.DTO
{
    public class UpdateVideoStateRequest
    {
        public bool? IsPaused { get; set; }
        public int? CurrentTimeInSeconds { get; set; }
    }
}
