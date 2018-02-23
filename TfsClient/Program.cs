using System;
using System.Security.Principal;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi.Models;
using Microsoft.VisualStudio.Services.Common;
using Microsoft.VisualStudio.Services.WebApi;

namespace TfsClient
{
    public class Program
    {
        static void Main(string[] args)
        {
            var user = WindowsIdentity.GetCurrent();

            var collectionUri = "http://aws-tfs:8080/tfs/NtCloud";
            var teamProjectName = "NtCloud";
            // Create instance of VssConnection using Windows credentials (NTLM)
            VssConnection connection = new VssConnection(new Uri(collectionUri), new VssCredentials(new WindowsCredential(true)));
            
            //create a wiql object and build our query
            Wiql wiql = new Wiql()
            {
                Query = "Select [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.Activity], [System.Title], [System.AssignedTo], [System.State], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate], [System.AreaPath] " +
                        "From WorkItemLinks " +
                        "Where (Source.[System.TeamProject] = '" + teamProjectName + "' and Source.[System.State] <> 'Removed' and Source.[System.WorkItemType] <> 'Task') " +
                        "And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') " +
                        "And (Target.[System.TeamProject] = '" + teamProjectName + "' and Target.[System.State] = 'Done' and Target.[Microsoft.VSTS.Common.ClosedDate] <= '2018-12-31T00:00:00.0000000' and Target.[Microsoft.VSTS.Common.ClosedDate] >= '2018-01-01T00:00:00.0000000' and Target.[System.AssignedTo] = '" + user.Name + "' and Target.[System.WorkItemType] = 'Task') " +
                        "Order By [System.Id] mode (Recursive, ReturnMatchingChildren) "
            };

            // Create instance of WorkItemTrackingHttpClient using VssConnection
            WorkItemTrackingHttpClient witClient = connection.GetClient<WorkItemTrackingHttpClient>();
            WorkItemQueryResult workItemQueryResult = witClient.QueryByWiqlAsync(wiql).Result;

        }
    }
}
