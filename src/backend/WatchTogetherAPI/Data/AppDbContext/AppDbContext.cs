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

            // Настройка связи Room → Video (одна комната много видео)
            modelBuilder.Entity<Video>()
                .HasOne(v => v.Room)
                .WithMany(r => r.Videos)
                .HasForeignKey(v => v.RoomId)
                .OnDelete(DeleteBehavior.Cascade); // или Restrict в зависимости от требований

            // Конфигурация для VideoState
            modelBuilder.Entity<Room>(entity =>
            {
                // Настройка VideoState как owned entity
                entity.OwnsOne(r => r.VideoState, vs => // VideoState не существует отдельно от `Room` и будет храниться в той же таблице, что и `Room`, в базе данных.
                {
                    vs.Property(v => v.IsPaused)
                        .HasColumnName("IsPaused")          // Столбец IsPaused
                        .HasDefaultValue(true);             // Значение по умолчанию IsPaused = true
                    
                    vs.Property(v => v.CurrentTime)
                        .HasColumnName("CurrentTime")       // Столбец CurrentTime
                        // .HasConversion(                     // Преобразование  
                        //     v => v.Ticks,                   // Хранение времени в виде количества тиков (Ticks)
                        //     v => TimeSpan.FromTicks(v))     // Преобразования обратно в TimeSpan
                        .HasDefaultValue(TimeSpan.Zero);    // Значение по умолчанию CurrentTime = TimeSpan.Zero.
                    
                    vs.Property(v => v.LastUpdated)     
                        .HasColumnName("LastUpdated")       // Столбец CurrentTime LastUpdated
                        .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");       // SQL-функция PostrgeSQL NOW(), возвращает текущую дату и время в формате UTC
                    
                    // Связь с Video
                    vs.HasOne(v => v.CurrentVideo)
                        .WithMany()
                        .HasForeignKey(vs => vs.CurrentVideoId)    // Внешний ключ CurrentVideoId для связи с таблицей Video.
                        .OnDelete(DeleteBehavior.SetNull);
                });

                // Остальные настройки для Room
                entity.HasOne(r => r.CreatedByUser)
                    .WithMany(u => u.CreatedRooms)
                    .HasForeignKey(r => r.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(r => r.Participants)
                    .WithOne(p => p.Room)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}



