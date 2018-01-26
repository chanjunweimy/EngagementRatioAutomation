using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using Microsoft.AspNetCore.Mvc;

namespace EngagementRatioAutomation.Controllers
{
    /// <summary>
    /// Controller that connects to Tfs.
    /// </summary>
    [Produces("application/json")]
    [Route("api/TfsTask")]
    public class TfsTaskController : Controller
    {
        /// <summary>
        /// Get all tfs tasks associated by the user
        /// </summary>
        [HttpGet]
        public IActionResult GetWorkItems()
        {
            var user = (WindowsIdentity) User.Identity;
            return new ObjectResult(user.Name);
        }
    }
}