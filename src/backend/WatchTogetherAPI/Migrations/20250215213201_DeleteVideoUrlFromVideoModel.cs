using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchTogetherAPI.Migrations
{
    /// <inheritdoc />
    public partial class DeleteVideoUrlFromVideoModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                table: "Videos");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms",
                column: "CurrentVideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms");

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "Videos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms",
                column: "CurrentVideoId",
                unique: true);
        }
    }
}
