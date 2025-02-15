using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;
using WatchTogetherAPI.Models;

namespace WatchTogetherAPI.Data.AppDbContext
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Participant> Participants { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Video> Videos { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Настройка составного ключа для Participant, состоящий из двух полей: UserId и RoomId.
            modelBuilder.Entity<Participant>()
                .HasKey(p => new { p.UserId, p.RoomId });

            // Настройка связей для Room → User
            modelBuilder.Entity<Room>()
                .HasOne(r => r.CreatedByUser)            // У комнаты есть один создатель (User)
                .WithMany(u => u.CreatedRooms)           // У пользователя может быть несколько созданных комнат
                .HasForeignKey(r => r.CreatedByUserId)   // Внешний ключ: CreatedByUserId в таблице Rooms
                .OnDelete(DeleteBehavior.Restrict);      // Запрет каскадного удаления

            // Правильная настройка связи User → Room
            modelBuilder.Entity<User>()
                .HasMany(u => u.CreatedRooms) // У пользователя много комнат
                .WithOne(r => r.CreatedByUser) // У комнаты один создатель
                .HasForeignKey(r => r.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);


            // Добавляем каскадное удаление для участников комнаты
            modelBuilder.Entity<Room>()
                .HasMany(r => r.Participants)
                .WithOne(p => p.Room)
                .OnDelete(DeleteBehavior.Cascade); // <-- Вот это новая строка

            // Настройка индексов
            modelBuilder.Entity<User>()     // Уникальный индекс для User.Username (логины не повторяются)
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<Room>()     // Неуникальный индекс для Room.RoomName(ускорение поиска по имени комнаты).
                .HasIndex(r => r.RoomName);

            // Настройка связи Video → Room (многие к одному)

            modelBuilder.Entity<Video>()
                .HasOne(v => v.Room)
                .WithMany()
                .HasForeignKey("RoomId")
                .OnDelete(DeleteBehavior.Cascade);

            // Настройка связи Room.CurrentVideo (один ко многим)

            modelBuilder.Entity<Room>()
                .HasOne(r => r.CurrentVideo)
                .WithMany()     // Видео может быть в нескольких комнатах
                .HasForeignKey(r => r.CurrentVideoId)
                .OnDelete(DeleteBehavior.SetNull);      // Устанавливает null при удалении видео
        }
    }
}



