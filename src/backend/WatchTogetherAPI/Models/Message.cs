using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WatchTogetherAPI.Models
{
    public class Message
    {
        [Key]
        public Guid MessageId { get; set; } = Guid.NewGuid();

        [Required]
        [ForeignKey("Room")]
        public Guid RoomId { get; set; }

        [Required]
        [ForeignKey("Sender")]
        public Guid SenderId { get; set; }

        [Required]
        public string MessageText { get; set; }

        [Required]
        public DateTime SentAt { get; set; } = DateTime.Now;

        // Навигационные свойства
        public User Sender { get; set; }
        public Room Room { get; set; }
    }
}
