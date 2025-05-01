using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;
using WatchTogetherAPI.Data.AppDbContext;

/// <summary>
/// Класс DesignTimeDbContextFactory используется для создания экземпляра DbContext во время разработки,
/// в частности, при выполнении миграций Entity Framework Core.
/// Это позволяет инструментам EF Core создавать и применять миграции без запуска приложения.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    /// <summary>
    /// Создает новый экземпляр контекста базы данных для использования во время разработки.
    /// </summary>
    /// <param name="args">Аргументы командной строки, переданные в процессе выполнения.</param>
    /// <returns>Настроенный экземпляр AppDbContext.</returns>
    public AppDbContext CreateDbContext(string[] args)
    {
        // Создаем и настраиваем конфигурацию для чтения настроек из appsettings.json
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory()) // Устанавливаем базовый путь к текущей директории
            .AddJsonFile("appsettings.json", optional: false) // Загружаем настройки из файла конфигурации
            .Build();

        // Создаем построитель опций для DbContext
        var builder = new DbContextOptionsBuilder<AppDbContext>();
        
        // Получаем строку подключения из конфигурации
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        
        // Настраиваем контекст для использования PostgreSQL
        builder.UseNpgsql(connectionString);

        // Возвращаем новый экземпляр контекста с настроенными опциями
        return new AppDbContext(builder.Options);
    }
}