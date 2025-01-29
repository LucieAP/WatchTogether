using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;
using WatchTogetherCore.Models;

namespace WatchTogetherCore.Data.AppDbContext
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users {  get; set; } 
        public DbSet<Room> Rooms {  get; set; } 
        public DbSet<Participant> Participants {  get; set; } 
        public DbSet<Message> Messages {  get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Настройка составного ключа для Participant, состоящий из двух полей: UserId и RoomId.
            modelBuilder.Entity<Participant>()
                .HasKey(p => new { p.UserId, p.RoomId });

            // Настройка связей для Room → User
            modelBuilder.Entity<Room>()
                .HasOne(r => r.CreatedByUser)            // У комнаты есть один создатель (User)
                .WithMany(u => u.CreatedRooms)           // У пользователя может быть мclearного созданных комнат
                .HasForeignKey(r => r.CreatedByUserId)   // Внешний ключ: CreatedByUserId в таблице Rooms
                .OnDelete(DeleteBehavior.Restrict);      // Запрет каскадного удаления

            // Настройка индексов
            modelBuilder.Entity<User>()     // Уникальный индекс для User.Username (логины не повторяются)
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<Room>()     // Неуникальный индекс для Room.RoomName(ускорение поиска по имени комнаты).
                .HasIndex(r => r.RoomName);
        }
    }
}



