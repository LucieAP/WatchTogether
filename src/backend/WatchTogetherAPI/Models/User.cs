using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace WatchTogetherAPI.Models
{
    public enum UserStatus
    {
        UnAuthed,
        Authed
    }

    public class User
    {
        public User()
        {
            CreatedRooms = new List<Room>();
            RoomParticipants = new List<Participant>();
        }

        [Key]
        public Guid UserId { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Username { get; set; }

        public string PasswordHash { get; set; } = "default-hash";

        [MaxLength(100)]
        public string? Email { get; set; }

        // Идентификатор пользователя в Google
        public string? GoogleId { get; set; }

        [Required]
        public UserStatus Status { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public string? Fingerprint { get; set; }

        // Навигационные свойства с внешними сущностями

        //[JsonIgnore]
        public virtual ICollection<Room> CreatedRooms { get; set; }

        //[JsonIgnore]
        public virtual ICollection<Participant> RoomParticipants { get; set; }
    }
}
