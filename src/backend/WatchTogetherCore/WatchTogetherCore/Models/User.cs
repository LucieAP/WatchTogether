using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace WatchTogetherCore.Models
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

        [Required]
        public UserStatus Status { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Навигационные свойства с внешними сущностями

        //[JsonIgnore]
        public virtual ICollection<Room> CreatedRooms { get; set; }

        //[JsonIgnore]
        public virtual ICollection<Participant> RoomParticipants { get; set; }
    }
}
