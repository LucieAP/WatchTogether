using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using WatchTogetherAPI.Data.AppDbContext;

namespace WatchTogetherAPI.Extensions
{
    public static class DatabaseInitializer
    {
        public static async Task InitializeDatabaseAsync(AppDbContext context)
        {
            // Проверяем, созданы ли все таблицы в базе
            if (!await context.Database.CanConnectAsync()) // Проверка соединения с базой данных
            {
                Console.WriteLine("Невозможно подключиться к базе данных. Создание базы данных...");
                await context.Database.EnsureCreatedAsync(); // Метод EnsureCreatedAsync() создает основную структуру БД
            }

            // Добавляем начальные данные, если это необходимо
            // await SeedDataAsync(context);
            
            Console.WriteLine("Инициализация базы данных завершена.");
        }

        // Метод для заполнения начальными данными, если необходимо
        private static async Task SeedDataAsync(AppDbContext context)
        {
            // Пример: проверка наличия данных в таблице и добавление, если их нет
            // if (!await context.YourTable.AnyAsync())
            // {
            //     context.YourTable.Add(new YourEntity { ... });
            //     await context.SaveChangesAsync();
            // }
        }
    }
} 