using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchTogetherAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoModelAndEditedRoomModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VideoUrl",
                table: "Rooms");

            migrationBuilder.AddColumn<TimeSpan>(
                name: "CurrentTime",
                table: "Rooms",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<Guid>(
                name: "CurrentVideoId",
                table: "Rooms",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPaused",
                table: "Rooms",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastUpdated",
                table: "Rooms",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "Videos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoId = table.Column<string>(type: "text", nullable: false),
                    VideoUrl = table.Column<string>(type: "text", nullable: false),
                    Duration = table.Column<TimeSpan>(type: "interval", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    RoomId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Videos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Videos_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "RoomId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms",
                column: "CurrentVideoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Videos_RoomId",
                table: "Videos",
                column: "RoomId");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Videos_CurrentVideoId",
                table: "Rooms",
                column: "CurrentVideoId",
                principalTable: "Videos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Videos_CurrentVideoId",
                table: "Rooms");

            migrationBuilder.DropTable(
                name: "Videos");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "CurrentTime",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "CurrentVideoId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "IsPaused",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "LastUpdated",
                table: "Rooms");

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "Rooms",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
