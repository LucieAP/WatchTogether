using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchTogetherAPI.Migrations
{
    /// <inheritdoc />
    public partial class EditVideoModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Duration",
                table: "Videos");

            migrationBuilder.AddColumn<int>(
                name: "DurationInSeconds",
                table: "Videos",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DurationInSeconds",
                table: "Videos");

            migrationBuilder.AddColumn<TimeSpan>(
                name: "Duration",
                table: "Videos",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));
        }
    }
}
