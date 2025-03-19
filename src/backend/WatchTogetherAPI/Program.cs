using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Hubs;
using WatchTogetherAPI.Services;

namespace WatchTogetherAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddDistributedMemoryCache(); // ����������� ��� �������� ������
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(20);
                options.Cookie.HttpOnly = true;
            });

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {   // ��������� ����������� ������   
                    //options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddRazorPages();
            builder.Services.AddSignalR();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy/*.AllowAnyOrigin()*/
                          .WithOrigins("https://localhost:5173")
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .WithExposedHeaders("X-User-Id") // ��������� ������� ������ X-User-Id
                          .AllowCredentials(); // Cookie
                });
            });

            builder.Services.AddHostedService<RoomCleanupService>();        // ������ ������� ������ �� ��

            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString));


            builder.Services.AddRazorPages();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseCors("AllowAll");

            app.UseSession();

            app.UseStaticFiles();           // ��������� �������� ����� �� wwwroot

            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.MapControllers();

            app.MapFallbackToFile("index.html");

            app.MapHub<MediaHub>("mediaHub");    // ���+�����

            app.Run();
        }
    }
}
