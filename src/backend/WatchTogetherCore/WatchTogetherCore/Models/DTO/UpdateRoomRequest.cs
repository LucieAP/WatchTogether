using System.ComponentModel.DataAnnotations;

namespace WatchTogetherCore.Models.DTO
{
    public class UpdateRoomRequest
    {
        [StringLength(50)]
        public string? RoomName { get; set; } 

        [MaxLength(150)]
        public string? Description { get; set; }
    }
}
