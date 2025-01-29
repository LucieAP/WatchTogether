using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using WatchTogetherCore.Data.AppDbContext;
using WatchTogetherCore.Models;

namespace WatchTogetherCore.Controllers
{
    public class RoomsController : Controller
    {

        private readonly AppDbContext _context;

        public RoomsController(AppDbContext context)
        {
            _context = context;
        }


        // GET: Rooms


        // GET: Rooms/Create

        // POST: Rooms/Create



        // GET: Rooms/Edit/id


        // POST: Rooms/Edit/id


        // GET: Rooms/Delete/id


        // POST: Rooms/Delete/5

    }
}
