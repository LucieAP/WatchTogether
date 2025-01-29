using System.ComponentModel.DataAnnotations;

namespace WatchTogetherCore.Models
{
    public enum UserStatus
    {
        UnAuthed,
        Authed
    }

    public class User
    {
        [Key]
        public Guid UserId { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Username { get; set; }

        //[Required]
        //public byte[] PasswordHash { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        [Required]
        public UserStatus Status { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Навигационные свойства с внешними сущностями

        public ICollection<Room> CreatedRooms { get; set; }
        public ICollection<Participant> RoomParticipants { get; set; }
    }
}
