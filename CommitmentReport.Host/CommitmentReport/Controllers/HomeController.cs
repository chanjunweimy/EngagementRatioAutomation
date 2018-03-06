using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CommitmentReport.Controllers
{
    /// <summary>
    /// Default controller that redirects browser to swagger url.
    /// </summary>
    public class HomeController : Controller
    {
        /// <summary>
        /// Method that redirects browser to swagger url.
        /// </summary>
        public IActionResult Index()
        {
            return Redirect("/swagger");
        }
    }
}
