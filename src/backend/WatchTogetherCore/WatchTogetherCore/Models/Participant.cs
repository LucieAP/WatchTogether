    using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WatchTogetherCore.Models
{
    public enum ParticipantRole
    {
        Creator,
        Member
    }

    public class Participant
    {
        [ForeignKey("Room")]
        public Guid RoomId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        public DateTime JoinedAt { get; set; } = DateTime.Now;

        [Required]
        public ParticipantRole Role { get; set; }

        // Навигационные свойства с внешними сущностями

        public virtual User User { get; set; }
        public virtual Room Room { get; set; }

    }
}
