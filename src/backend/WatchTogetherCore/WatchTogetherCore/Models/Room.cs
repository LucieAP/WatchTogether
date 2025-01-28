using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WatchTogetherCore.Models
{
    public enum RoomStatus
    {
        Private,
        Public
    }

    public class Room
    {
        [Key]
        public Guid RoomId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string RoomName { get; set; }
        [Required]
        [MaxLength(150)]
        public string Description { get; set; }
        [Required]
        public RoomStatus Status { get; set; }

        [ForeignKey("CreatedByUser")]       // Ссылаемся на навигационное свойство
        public Guid CreatedByUserId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime ExpiresAt { get; set; }

        [Url]
        public string VideoUrl { get; set; }

        public string InvitationLink { get; set; }


        // Навигационные свойства с внешними сущностями

        public User CreatedByUser {  get; set; }        
        public ICollection<Participant> Participants { get; set; }
    
    }
}
