using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchTogetherAPI.Migrations
{
    /// <inheritdoc />
    public partial class EditVideoandRoomModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rooms_Videos_CurrentVideoId",
                table: "Rooms");

            migrationBuilder.DropForeignKey(
                name: "FK_Videos_Rooms_RoomId",
                table: "Videos");

            migrationBuilder.DropIndex(
                name: "IX_Videos_RoomId",
                table: "Videos");

            migrationBuilder.DropIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "CurrentVideoId",
                table: "Rooms");

            migrationBuilder.AlterColumn<Guid>(
                name: "RoomId",
                table: "Videos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_Videos_RoomId",
                table: "Videos",
                column: "RoomId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Videos_Rooms_RoomId",
                table: "Videos",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "RoomId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Videos_Rooms_RoomId",
                table: "Videos");

            migrationBuilder.DropIndex(
                name: "IX_Videos_RoomId",
                table: "Videos");

            migrationBuilder.AlterColumn<Guid>(
                name: "RoomId",
                table: "Videos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CurrentVideoId",
                table: "Rooms",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Videos_RoomId",
                table: "Videos",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_CurrentVideoId",
                table: "Rooms",
                column: "CurrentVideoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Rooms_Videos_CurrentVideoId",
                table: "Rooms",
                column: "CurrentVideoId",
                principalTable: "Videos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Videos_Rooms_RoomId",
                table: "Videos",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "RoomId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
