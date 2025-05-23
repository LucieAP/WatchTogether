﻿// <auto-generated />
using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using WatchTogetherAPI.Data.AppDbContext;

#nullable disable

namespace WatchTogetherAPI.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20250331183754_DeletePrecision")]
    partial class DeletePrecision
    {
        /// <inheritdoc />
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "9.0.1")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("WatchTogetherAPI.Models.Participant", b =>
                {
                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid");

                    b.Property<Guid>("RoomId")
                        .HasColumnType("uuid");

                    b.Property<DateTime>("JoinedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<int>("Role")
                        .HasColumnType("integer");

                    b.HasKey("UserId", "RoomId");

                    b.HasIndex("RoomId");

                    b.ToTable("Participants");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.Room", b =>
                {
                    b.Property<Guid>("RoomId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<Guid>("CreatedByUserId")
                        .HasColumnType("uuid");

                    b.Property<string>("Description")
                        .IsRequired()
                        .HasMaxLength(150)
                        .HasColumnType("character varying(150)");

                    b.Property<DateTime>("ExpiresAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("InvitationLink")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("RoomName")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.HasKey("RoomId");

                    b.HasIndex("CreatedByUserId");

                    b.HasIndex("RoomName");

                    b.ToTable("Rooms");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.User", b =>
                {
                    b.Property<Guid>("UserId")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("PasswordHash")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)");

                    b.HasKey("UserId");

                    b.HasIndex("Username")
                        .IsUnique();

                    b.ToTable("Users");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.Video", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<int>("DurationInSeconds")
                        .HasColumnType("integer");

                    b.Property<Guid?>("RoomId")
                        .HasColumnType("uuid");

                    b.Property<string>("Title")
                        .HasColumnType("text");

                    b.Property<string>("VideoId")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("RoomId");

                    b.ToTable("Videos");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.Participant", b =>
                {
                    b.HasOne("WatchTogetherAPI.Models.Room", "Room")
                        .WithMany("Participants")
                        .HasForeignKey("RoomId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("WatchTogetherAPI.Models.User", "User")
                        .WithMany("RoomParticipants")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Room");

                    b.Navigation("User");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.Room", b =>
                {
                    b.HasOne("WatchTogetherAPI.Models.User", "CreatedByUser")
                        .WithMany("CreatedRooms")
                        .HasForeignKey("CreatedByUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.OwnsOne("WatchTogetherAPI.Models.VideoState", "VideoState", b1 =>
                        {
                            b1.Property<Guid>("RoomId")
                                .HasColumnType("uuid");

                            b1.Property<TimeSpan>("CurrentTime")
                                .ValueGeneratedOnAdd()
                                .HasColumnType("interval")
                                .HasDefaultValue(new TimeSpan(0, 0, 0, 0, 0))
                                .HasColumnName("CurrentTime");

                            b1.Property<Guid?>("CurrentVideoId")
                                .HasColumnType("uuid");

                            b1.Property<bool>("IsPaused")
                                .ValueGeneratedOnAdd()
                                .HasColumnType("boolean")
                                .HasDefaultValue(true)
                                .HasColumnName("IsPaused");

                            b1.Property<DateTime>("LastUpdated")
                                .ValueGeneratedOnAdd()
                                .HasColumnType("timestamp with time zone")
                                .HasColumnName("LastUpdated")
                                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

                            b1.HasKey("RoomId");

                            b1.HasIndex("CurrentVideoId");

                            b1.ToTable("Rooms");

                            b1.HasOne("WatchTogetherAPI.Models.Video", "CurrentVideo")
                                .WithMany()
                                .HasForeignKey("CurrentVideoId")
                                .OnDelete(DeleteBehavior.SetNull);

                            b1.WithOwner()
                                .HasForeignKey("RoomId");

                            b1.Navigation("CurrentVideo");
                        });

                    b.Navigation("CreatedByUser");

                    b.Navigation("VideoState")
                        .IsRequired();
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.Video", b =>
                {
                    b.HasOne("WatchTogetherAPI.Models.Room", "Room")
                        .WithMany("Videos")
                        .HasForeignKey("RoomId")
                        .OnDelete(DeleteBehavior.Cascade);

                    b.Navigation("Room");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.Room", b =>
                {
                    b.Navigation("Participants");

                    b.Navigation("Videos");
                });

            modelBuilder.Entity("WatchTogetherAPI.Models.User", b =>
                {
                    b.Navigation("CreatedRooms");

                    b.Navigation("RoomParticipants");
                });
#pragma warning restore 612, 618
        }
    }
}
