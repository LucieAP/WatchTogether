﻿using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WatchTogetherAPI.Models
{
    public enum RoomStatus
    {
        [Description("Приватная")]
        Private,

        [Description("Публичная")]
        Public
    }

    public class Room
    {
        public Room()
        {
            Participants = new List<Participant>();
            VideoState = new VideoState();
            Videos = new List<Video>();
        }

        [Key]
        public Guid RoomId { get; set; } = Guid.NewGuid();

        [Required]
        [Display(Name = "Название комнаты")]
        [StringLength(50)]
        public string RoomName { get; set; }

        [Required]
        [Display(Name = "Описание комнаты")]
        [MaxLength(150)]
        public string Description { get; set; }

        [Required]
        [Display(Name = "Тип")]
        public RoomStatus Status { get; set; }

        [ForeignKey("CreatedByUser")]       // Ссылаемся на навигационное свойство
        public Guid CreatedByUserId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime ExpiresAt { get; set; }

        public string InvitationLink { get; set; }


        // Навигационные свойства с внешними сущностями
        public virtual VideoState VideoState {get; set;}
        public virtual User CreatedByUser { get; set; }
        public virtual ICollection<Participant> Participants { get; set; }
        public virtual ICollection<Video> Videos { get; set; }
    }
}
