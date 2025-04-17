using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchTogetherAPI.Migrations
{
    /// <inheritdoc />
    public partial class DeletePrecision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<TimeSpan>(
                name: "CurrentTime",
                table: "Rooms",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0),
                oldClrType: typeof(TimeSpan),
                oldType: "interval(3)",
                oldPrecision: 3,
                oldDefaultValue: new TimeSpan(0, 0, 0, 0, 0));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<TimeSpan>(
                name: "CurrentTime",
                table: "Rooms",
                type: "interval(3)",
                precision: 3,
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0),
                oldClrType: typeof(TimeSpan),
                oldType: "interval",
                oldDefaultValue: new TimeSpan(0, 0, 0, 0, 0));
        }
    }
}
