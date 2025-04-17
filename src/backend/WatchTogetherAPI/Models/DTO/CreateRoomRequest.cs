using System.ComponentModel.DataAnnotations;

namespace WatchTogetherAPI.Models.DTO
{
    public class CreateRoomRequest
    {
        [Required]
        [StringLength(50)]
        public string RoomName { get; set; }

        [Required]
        [MaxLength(150)]
        public string Description { get; set; }

        public RoomStatus Status { get; set; }
        
        // Флаг, указывающий, что запрос пришел от гостевого пользователя
        public bool IsGuest { get; set; }
    }
}
