using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using EngagementRatioAutomation.Controllers.dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.TeamFoundation.Common;
using Microsoft.TeamFoundation.Core.WebApi;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi.Models;
using Microsoft.VisualStudio.Services.Common;
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
        private static readonly string URL_COLLECTION_NTCLOUD = "http://aws-tfs:8080/tfs/NtCloud";
        private static readonly string URL_COLLECTION_NTSG = "http://aws-tfs:8080/tfs/NumtechSg";
        private static readonly string NAME_PROJECT_NTCLOUD = "NtCloud";
        private static readonly string NAME_PROJECT_MISCSG = "MISC Sg";
        private static readonly string[] FIELDS = new string[]
                                                        {
                                                            "System.Id",
                                                            "System.WorkItemType",
                                                            "Microsoft.VSTS.Common.Activity",
                                                            "System.Title",
                                                            "System.AssignedTo",
                                                            "System.State",
                                                            "System.IterationPath",
                                                            "Microsoft.VSTS.Common.ClosedDate",
                                                            "System.AreaPath",
                                                            "Nt.Duration"
                                                        };

        [HttpGet("my-name")]
        public WindowsUser GetMyName()
        {
            var user = (WindowsIdentity)User.Identity;
            return new WindowsUser
            {
                Name = user.Name
            };
        }

        /// <summary>
        /// Get all tfs tasks associated by the user
        /// </summary>
        [HttpGet("my-yearly-work-item")]
        public List<NtWorkItem> GetMyCurrentYearWorkItems()
        {
            GetYearStartAndEndDate(DateTime.Now, out var startDate, out var endDate);
            return GetMyWorkItems(startDate.ToString("yyyy MMMM dd"), endDate.ToString("yyyy MMMM dd"));
        }

        /// <summary>
        /// Get all tfs tasks associated by the user
        /// </summary>
        [HttpGet("dummy-work-item")]
        public List<NtWorkItem> GetMyDummyWorkItems()
        {
            var ntWorkItems = new List<NtWorkItem>();
            ntWorkItems.Add(new NtWorkItem
            {
                Id = 1,
                Activity = "development",
                AreaPath = "UI",
                AssignedTo = "Ali",
                ClosedDate = "01 April 2017",
                Duration = 2,
                IterationPath = "Sprint 1",
                Product = "Baba",
                State = "Done",
                Title = "Create dummy UI",
                WorkItemType = "Task"
            });
            return ntWorkItems;
        }


        /// <summary>
        /// Get tfs Tasks by start and end date
        /// </summary>
        [HttpGet("my-work-item")]
        public List<NtWorkItem> GetMyWorkItems(string start, string end)
        {
            var user = (WindowsIdentity)User.Identity;

            var witClient = GetWitClient();

            var startDate = DateTime.Parse(start);
            var endDate = DateTime.Parse(end);
            var teamProjectName = NAME_PROJECT_NTCLOUD;

            var workItemQueryResult = WorkItemQueryResult(teamProjectName, endDate, startDate, user.Name, witClient, out var workItemLinks);
            if (!workItemLinks.Any())
            {
                return null;
            }

            var ntWorkItems = GetNtWorkItems(workItemLinks, witClient, workItemQueryResult);
            return ntWorkItems;
        }

        /// <summary>
        /// Get tfs Tasks by start and end date and specified user
        /// </summary>
        [HttpGet("work-item-individual")]
        public List<NtWorkItem> GetWorkItems(string start, string end, string userName)
        {
            var witClient = GetWitClient();

            var startDate = DateTime.Parse(start);
            var endDate = DateTime.Parse(end);
            var teamProjectName = NAME_PROJECT_NTCLOUD;

            var workItemQueryResult = WorkItemQueryResult(teamProjectName, endDate, startDate, userName, witClient, out var workItemLinks);
            if (!workItemLinks.Any())
            {
                return null;
            }

            var ntWorkItems = GetNtWorkItems(workItemLinks, witClient, workItemQueryResult);
            return ntWorkItems;
        }

        /// <summary>
        /// Get tfs Tasks by start and end date and specified users
        /// </summary>
        [HttpPost("work-item-all")]
        public List<NtWorkItem> GetWorkItems([FromBody] WorkItemInput input)
        {
            var witClient = GetWitClient();

            var startDate = DateTime.Parse(input.Start);
            var endDate = DateTime.Parse(input.End);
            var teamProjectName = NAME_PROJECT_NTCLOUD;

            var workItemQueryResult = WorkItemQueryResult(teamProjectName, endDate, startDate, input.NtTeamMembers, witClient, out var workItemLinks);
            if (!workItemLinks.Any())
            {
                return null;
            }

            var ntWorkItems = GetNtWorkItems(workItemLinks, witClient, workItemQueryResult);
            return ntWorkItems;
        }



        /// <summary>
        /// Get tfs Tasks by start and end date
        /// </summary>
        [HttpGet("team")]
        public List<NtTeamMember> GetTeamMembers()
        {
            var teamProjectName = NAME_PROJECT_MISCSG;
            var collectionUri = URL_COLLECTION_NTSG;
            // Create instance of VssConnection using Windows credentials (NTLM)
            var connection = new VssConnection(new Uri(collectionUri), new VssCredentials(new WindowsCredential(true)));
            // Create instance of WorkItemTrackingHttpClient using VssConnection
            var projectClient = connection.GetClient<ProjectHttpClient>();
            var project = projectClient.GetProject(teamProjectName).Result;
            //var team = project.DefaultTeam;

            var teamClient = connection.GetClient<TeamHttpClient>();
            var teamMembers = teamClient.GetTeamMembersAsync(project.Id.ToString(), project.DefaultTeam.Id.ToString()).Result;

            return teamMembers.Select(teamMember => new NtTeamMember
                {
                    Id = teamMember.Id,
                    UniqueName = teamMember.UniqueName,
                    DisplayName = teamMember.DisplayName
                })
                .ToList();
        }

        private static List<NtWorkItem> GetNtWorkItems(WorkItemLink[] workItemLinks, WorkItemTrackingHttpClient witClient,
            WorkItemQueryResult workItemQueryResult)
        {
            var fields = FIELDS;
            var allIds = new List<int>();
            var epicIds = new List<int>();
            var reverseIdDict = new Dictionary<int, bool>();
            var idDict = new Dictionary<int, int?>();
            var categoryDict = new Dictionary<int, string>();
            foreach (var workItemLink in workItemLinks)
            {
                allIds.Add(workItemLink.Target.Id);
                if (!workItemLink.Rel.IsNullOrEmpty())
                {
                    reverseIdDict[workItemLink.Source.Id] = true;
                    idDict[workItemLink.Target.Id] = workItemLink.Source.Id;
                    continue;
                }
                idDict.Add(workItemLink.Target.Id, null);
                epicIds.Add(workItemLink.Target.Id);
            }
            var epicWorkItems = witClient.GetWorkItemsAsync(epicIds, fields, workItemQueryResult.AsOf).Result;
            foreach (var epicWorkItem in epicWorkItems)
            {
                var id = int.Parse(epicWorkItem.Fields["System.Id"].ToString());
                var title = epicWorkItem.Fields["System.Title"].ToString();
                categoryDict.Add(id, title);
            }

            var taskIds = new List<int>();
            foreach (var id in allIds)
            {
                if (reverseIdDict.ContainsKey(id))
                {
                    continue;
                }
                taskIds.Add(id);
                var refId = id;
                while (idDict[refId].HasValue)
                {
                    refId = idDict[refId].Value;
                }
                categoryDict[id] = categoryDict[refId];
            }
            int skip = 0;
            int take = 50;

            var ntWorkItems = new List<NtWorkItem>();
            int[] curTaskIds;
            do
            {
                curTaskIds = taskIds.Skip(skip).Take(take).ToArray();
                var taskWorkItems = witClient.GetWorkItemsAsync(curTaskIds, fields, workItemQueryResult.AsOf).Result;

                foreach (var taskWorkItem in taskWorkItems)
                {
                    var id = int.Parse(taskWorkItem.Fields["System.Id"].ToString());
                    string workItemType = null;
                    if (taskWorkItem.Fields.ContainsKey("System.WorkItemType"))
                    {
                        workItemType = taskWorkItem.Fields["System.WorkItemType"].ToString();
                    }
                    string activity = null;
                    if (taskWorkItem.Fields.ContainsKey("Microsoft.VSTS.Common.Activity"))
                    {
                        activity = taskWorkItem.Fields["Microsoft.VSTS.Common.Activity"].ToString();
                    }
                    var title = taskWorkItem.Fields["System.Title"].ToString();
                    var assignedTo = taskWorkItem.Fields["System.AssignedTo"].ToString();
                    var state = taskWorkItem.Fields["System.State"].ToString();
                    string iterationPath = null;
                    if (taskWorkItem.Fields.ContainsKey("System.IterationPath"))
                    {
                        iterationPath = taskWorkItem.Fields["System.IterationPath"].ToString();
                    }
                    string closedDate = null;
                    if (taskWorkItem.Fields.ContainsKey("Microsoft.VSTS.Common.ClosedDate"))
                    {
                        closedDate = DateTime.Parse(taskWorkItem.Fields["Microsoft.VSTS.Common.ClosedDate"].ToString())
                            .ToString("yyyy MMMM dd");
                    }
                    string areaPath = null;
                    if (taskWorkItem.Fields.ContainsKey("System.AreaPath"))
                    {
                        areaPath = taskWorkItem.Fields["System.AreaPath"].ToString();
                    }
                    double? duration = null;
                    if (taskWorkItem.Fields.ContainsKey("Nt.Duration"))
                    {
                        duration = Double.Parse(taskWorkItem.Fields["Nt.Duration"].ToString());
                    }
                    var product = categoryDict[id];

                    var ntWorkItem = new NtWorkItem
                    {
                        Id = id,
                        WorkItemType = workItemType,
                        Activity = activity,
                        Title = title,
                        AssignedTo = assignedTo,
                        State = state,
                        IterationPath = iterationPath,
                        ClosedDate = closedDate,
                        AreaPath = areaPath,
                        Duration = duration,
                        Product = product
                    };
                    ntWorkItems.Add(ntWorkItem);
                }

                skip += take;
            } while (curTaskIds.Count() == take);
            return ntWorkItems;
        }

        private static WorkItemQueryResult WorkItemQueryResult(string teamProjectName, DateTime endDate, DateTime startDate,
            string userName, WorkItemTrackingHttpClient witClient, out WorkItemLink[] workItemLinks)
        {
//create a wiql object and build our query
            var wiql = new Wiql()
            {
                Query =
                    "Select [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.Activity], [System.Title], [System.AssignedTo], [System.State], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate], [System.AreaPath], [Nt.Duration] " +
                    "From WorkItemLinks " +
                    "Where (Source.[System.TeamProject] = '" + teamProjectName +
                    "' and Source.[System.State] <> 'Removed' and Source.[System.WorkItemType] <> 'Task') " +
                    "And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') " +
                    "And (Target.[System.TeamProject] = '" + teamProjectName +
                    "' and Target.[System.State] = 'Done' and Target.[Microsoft.VSTS.Common.ClosedDate] <= '" +
                    endDate.ToLongDateString() + "' and Target.[Microsoft.VSTS.Common.ClosedDate] >= '" +
                    startDate.ToLongDateString() + "' and Target.[System.AssignedTo] = '" + userName +
                    "' and Target.[System.WorkItemType] = 'Task') " +
                    "Order By [System.Id] mode (Recursive, ReturnMatchingChildren) "
            };


            var workItemQueryResult = witClient.QueryByWiqlAsync(wiql).Result;
            var relations = workItemQueryResult.WorkItemRelations;
            workItemLinks = relations as WorkItemLink[] ?? relations.ToArray();
            return workItemQueryResult;
        }

        private static WorkItemQueryResult WorkItemQueryResult(string teamProjectName, DateTime endDate, DateTime startDate,
            List<NtTeamMember> ntTeamMembers, WorkItemTrackingHttpClient witClient, out WorkItemLink[] workItemLinks)
        {
            var query =
                "Select [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.Activity], [System.Title], [System.AssignedTo], [System.State], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate], [System.AreaPath], [Nt.Duration] " +
                "From WorkItemLinks " +
                "Where (Source.[System.TeamProject] = '" + teamProjectName +
                "' and Source.[System.State] <> 'Removed' and Source.[System.WorkItemType] <> 'Task') " +
                "And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') " +
                "And (Target.[System.TeamProject] = '" + teamProjectName +
                "' and Target.[System.State] = 'Done' and Target.[Microsoft.VSTS.Common.ClosedDate] <= '" +
                endDate.ToLongDateString() + "' and Target.[Microsoft.VSTS.Common.ClosedDate] >= '" +
                startDate.ToLongDateString() + "' and ";
            for (var i = 0; i < ntTeamMembers.Count; i++)
            {
                query += " Target.[System.AssignedTo] = '" + ntTeamMembers[i].UniqueName + "' ";
                if (i < ntTeamMembers.Count - 1)
                {
                    query += " or ";
                }
            }
            query += " and Target.[System.WorkItemType] = 'Task') " +
                "Order By [System.Id] mode (Recursive, ReturnMatchingChildren) ";

            //create a wiql object and build our query
            var wiql = new Wiql()
            {
                Query = query
            };


            var workItemQueryResult = witClient.QueryByWiqlAsync(wiql).Result;
            var relations = workItemQueryResult.WorkItemRelations;
            workItemLinks = relations as WorkItemLink[] ?? relations.ToArray();
            return workItemQueryResult;
        }

        private static WorkItemTrackingHttpClient GetWitClient()
        {
            var collectionUri = URL_COLLECTION_NTCLOUD;
            // Create instance of VssConnection using Windows credentials (NTLM)
            var connection = new VssConnection(new Uri(collectionUri), new VssCredentials(new WindowsCredential(true)));
            // Create instance of WorkItemTrackingHttpClient using VssConnection
            return connection.GetClient<WorkItemTrackingHttpClient>();
        }

        private void GetYearStartAndEndDate(DateTime d, out DateTime startDate, out DateTime endDate)
        {
            startDate = new DateTime(d.Year, 1, 1);
            endDate = new DateTime(d.Year, 12, 31);
        }
    }
}