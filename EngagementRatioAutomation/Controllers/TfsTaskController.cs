using System;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using Microsoft.AspNetCore.Mvc;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi.Models;
using Microsoft.VisualStudio.Services.WebApi;

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
            var wiql =
                "SELECT [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.Activity], [System.Title], [System.AssignedTo], [System.State], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate], [System.AreaPath] FROM WorkItems WHERE[System.TeamProject] = @project and[System.AssignedTo] = @me ORDER BY[System.ChangedDate] DESC";
            //var wiql =
            //    "SELECT [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.Activity], [System.Title], [System.AssignedTo], [System.State], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate], [System.AreaPath] FROM WorkItemLinks WHERE (Source.[System.TeamProject] = @project and Source.[System.State] <> 'Removed' and Source.[System.WorkItemType] <> 'Task') and ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') and (Target.[System.TeamProject] = @project and Target.[System.State] = 'Done' and Target.[Microsoft.VSTS.Common.ClosedDate] <= '2018-12-31T00:00:00.0000000' and Target.[Microsoft.VSTS.Common.ClosedDate] >= '2018-01-01T00:00:00.0000000' and Target.[System.AssignedTo] = 'Chan Jun Wei <NUMTECH\\jw.chan>' and Target.[System.WorkItemType] = 'Task') ORDER BY [System.Id] mode(Recursive,ReturnMatchingChildren)";
            
            // Create instance of VssConnection using Windows credentials (NTLM)
            //VssConnection connection = new VssConnection(new Uri(collectionUri), new VssClientCredentials());

            // Create instance of WorkItemTrackingHttpClient using VssConnection
            //WorkItemTrackingHttpClient witClient = connection.GetClient<WorkItemTrackingHttpClient>();
            //List<QueryHierarchyItem> items = witClient.GetQueriesAsync(teamProjectName).Result;

            return new ObjectResult(user.Name);
        }
    }
}