using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using CommitmentReport.Controllers.dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.TeamFoundation.Common;
using Microsoft.TeamFoundation.Core.WebApi;
using Microsoft.TeamFoundation.Core.WebApi.Types;
using Microsoft.TeamFoundation.Work.WebApi;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi;
using Microsoft.TeamFoundation.WorkItemTracking.WebApi.Models;
using Microsoft.VisualStudio.Services.Common;
using Microsoft.VisualStudio.Services.WebApi;

namespace CommitmentReport.Controllers
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
        /// Get tfs Tasks by start and end date and specified users
        /// </summary>
        [HttpPost("work-item-all")]
        public List<NtWorkItem> GetWorkItems([FromBody] WorkItemInput input)
        {
            var ntCloudWorkItems = GetNtWorkItemsInCollection(input, URL_COLLECTION_NTCLOUD, NAME_PROJECT_NTCLOUD);
            var miscWorkItems = GetNtWorkItemsInCollection(input, URL_COLLECTION_NTSG, NAME_PROJECT_MISCSG);
            ntCloudWorkItems.AddRange(miscWorkItems);
            return ntCloudWorkItems;
        }

        [HttpPost("collapsed-work-item")]
        public Dictionary<string, List<NtCollapsedWorkItem>> GetCollapsedWorkItems([FromBody] WorkItemInput input)
        {
            var workItems = GetWorkItems(input);
            var collapsedWorkItems = new Dictionary<string, List<NtCollapsedWorkItem>>();
            var workItemDates = new Dictionary<string, Dictionary<string, int>>();
            foreach (var workItem in workItems)
            {
                if (!collapsedWorkItems.ContainsKey(workItem.AssignedTo))
                {
                    collapsedWorkItems[workItem.AssignedTo] = new List<NtCollapsedWorkItem>();
                    workItemDates[workItem.AssignedTo] = new Dictionary<string, int>();
                }

                var dateKey = workItem.ClosedDate;
                if (!workItemDates[workItem.AssignedTo].ContainsKey(dateKey))
                {
                    workItemDates[workItem.AssignedTo][dateKey] = collapsedWorkItems[workItem.AssignedTo].Count;
                    var collapsedWorkItem = new NtCollapsedWorkItem
                    {
                        Employee = workItem.AssignedTo,
                        Date = workItem.ClosedDate,
                        Title = workItem.Title,
                        //DurationDemonstration = 0,
                        DurationDeployment = 0,
                        DurationDesign = 0,
                        DurationDevelopment = 0,
                        DurationDocumentation = 0,
                        DurationMarketing = 0,
                        DurationRequirements = 0,
                        DurationTesting = 0,
                        DurationOthers = 0,
                        DurationNA = 0,
                        DurationTotal = 0,
                        Product = new Dictionary<string, double>()
                    };
                    collapsedWorkItems[workItem.AssignedTo].Add(collapsedWorkItem);
                }
                else
                {
                    collapsedWorkItems[workItem.AssignedTo][workItemDates[workItem.AssignedTo][dateKey]].Title +=
                        ", " + workItem.Title;
                }

                var itemIndex = workItemDates[workItem.AssignedTo][dateKey];

                if (workItem.Activity.IsNullOrEmpty())
                {
                    workItem.Activity = string.Empty;
                }
                workItem.Activity = workItem.Activity.Trim().ToLower();

                double duration = 0;
                if (workItem.Duration != null)
                {
                    duration = workItem.Duration.Value;
                }

                var isMisc = workItem.Product.ToUpper().Equals("MISC");
                if (!isMisc)
                {
                    var arr = workItem.Product.Split('.');
                    workItem.Product = String.Join(".", arr.Take(arr.Length - 1)).Trim();
                }

                if (!collapsedWorkItems[workItem.AssignedTo][itemIndex].Product.ContainsKey(workItem.Product) && !isMisc)
                {
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] = 0;
                }

                collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationTotal += duration;
                if (workItem.Activity.Equals(string.Empty))
                {
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationNA += duration;
                }
                else if (workItem.Activity.Equals("demonstration"))
                {
                    //collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationDemonstration += duration;
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationMarketing += duration;
                }
                else if (workItem.Activity.Equals("deployment"))
                {
                    if (!isMisc)
                    {
                        collapsedWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationDeployment += duration;
                }
                else if (workItem.Activity.Equals("design"))
                {
                    if (!isMisc)
                    {
                        collapsedWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationDesign += duration;
                }
                else if (workItem.Activity.Equals("development"))
                {
                    if (!isMisc)
                    {
                        collapsedWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationDevelopment += duration;
                }
                else if (workItem.Activity.Equals("documentation"))
                {
                    if (!isMisc)
                    {
                        collapsedWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationDocumentation += duration;
                }
                else if (workItem.Activity.Equals("marketing"))
                {
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationMarketing += duration;
                }
                else if (workItem.Activity.Equals("requirements"))
                {
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationRequirements += duration;
                }
                else if (workItem.Activity.Equals("testing"))
                {
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationTesting += duration;
                }
                else if (workItem.Activity.Equals("others"))
                {
                    collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationOthers += duration;
                }

                if (workItem.TeamProject.Trim().ToLower().Replace(" ", "").Equals("miscsg"))
                {
                    continue;
                }
            }
            return collapsedWorkItems;
        }

        [HttpPost("weekly-work-item")]
        public Dictionary<string, List<NtWeeklyWorkItem>> GetWeeklyWorkItems([FromBody] WorkItemInput input)
        {
            var workItems = GetWorkItems(input);
            workItems.Sort(CompareWorkItemByDate);
            var weeklyWorkItems = new Dictionary<string, List<NtWeeklyWorkItem>>();
            var workItemStartDates = new Dictionary<string, Dictionary<string, int>>();
            foreach (var workItem in workItems)
            {
                if (!weeklyWorkItems.ContainsKey(workItem.AssignedTo))
                {
                    weeklyWorkItems[workItem.AssignedTo] = new List<NtWeeklyWorkItem>();
                    workItemStartDates[workItem.AssignedTo] = new Dictionary<string, int>();
                }

                var curDate = DateTime.Parse(workItem.ClosedDate);
                var startDate = curDate.StartOfWeek(DayOfWeek.Monday);
                var endDate = curDate.EndOfWeek(DayOfWeek.Monday);

                var dateKey = startDate.ToString("yyyy MMMM dd"); 
                if (!workItemStartDates[workItem.AssignedTo].ContainsKey(dateKey))
                {
                    workItemStartDates[workItem.AssignedTo][dateKey] = weeklyWorkItems[workItem.AssignedTo].Count;
                    var weeklyWorkItem = new NtWeeklyWorkItem
                    {
                        Employee = workItem.AssignedTo,
                        WeekStartDate = dateKey,
                        WeekEndDate = endDate.ToString("yyyy MMMM dd"),
                        Title = workItem.Title,
                        //DurationDemonstration = 0,
                        DurationDeployment = 0,
                        DurationDesign = 0,
                        DurationDevelopment = 0,
                        DurationDocumentation = 0,
                        DurationMarketing = 0,
                        DurationRequirements = 0,
                        DurationTesting = 0,
                        DurationOthers = 0,
                        DurationNA = 0,
                        DurationTotal = 0,
                        Product = new Dictionary<string, double>()
                    };
                    weeklyWorkItems[workItem.AssignedTo].Add(weeklyWorkItem);
                }
                else
                {
                    weeklyWorkItems[workItem.AssignedTo][workItemStartDates[workItem.AssignedTo][dateKey]].Title +=
                        ", " + workItem.Title;
                }

                var itemIndex = workItemStartDates[workItem.AssignedTo][dateKey];

                if (workItem.Activity.IsNullOrEmpty())
                {
                    workItem.Activity = string.Empty;
                }
                workItem.Activity = workItem.Activity.Trim().ToLower();

                double duration = 0;
                if (workItem.Duration != null)
                {
                    duration = workItem.Duration.Value;
                }

                var isMisc = workItem.Product.ToUpper().Equals("MISC");
                if (!isMisc)
                {
                    var arr = workItem.Product.Split('.');
                    workItem.Product = String.Join(".", arr.Take(arr.Length - 1)).Trim();
                }
                if (!weeklyWorkItems[workItem.AssignedTo][itemIndex].Product.ContainsKey(workItem.Product) && !isMisc)
                {
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] = 0;
                }

                weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationTotal += duration;
                if (workItem.Activity.Equals(string.Empty))
                {
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationNA += duration;
                }
                else if (workItem.Activity.Equals("demonstration"))
                {
                    //collapsedWorkItems[workItem.AssignedTo][itemIndex].DurationDemonstration += duration;
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationMarketing += duration;
                }
                else if (workItem.Activity.Equals("deployment"))
                {
                    if (!isMisc)
                    {
                        weeklyWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationDeployment += duration;
                }
                else if (workItem.Activity.Equals("design"))
                {
                    if (!isMisc)
                    {
                        weeklyWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationDesign += duration;
                }
                else if (workItem.Activity.Equals("development"))
                {
                    if (!isMisc)
                    {
                        weeklyWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationDevelopment += duration;
                }
                else if (workItem.Activity.Equals("documentation"))
                {
                    if (!isMisc)
                    {
                        weeklyWorkItems[workItem.AssignedTo][itemIndex].Product[workItem.Product] += duration;
                    }
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationDocumentation += duration;
                }
                else if (workItem.Activity.Equals("marketing"))
                {
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationMarketing += duration;
                }
                else if (workItem.Activity.Equals("requirements"))
                {
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationRequirements += duration;
                }
                else if (workItem.Activity.Equals("testing"))
                {
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationTesting += duration;
                }
                else if (workItem.Activity.Equals("others"))
                {
                    weeklyWorkItems[workItem.AssignedTo][itemIndex].DurationOthers += duration;
                }

                if (workItem.TeamProject.Trim().ToLower().Replace(" ", "").Equals("miscsg"))
                {
                    continue;
                }
            }
            return weeklyWorkItems;
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

        private static List<NtWorkItem> GetNtWorkItemsInCollection(WorkItemInput input, string collectionUri, string teamProjectName)
        {
            var startDate = DateTime.Parse(input.Start);
            var endDate = DateTime.Parse(input.End);
            
            var witClient = GetWitClient(collectionUri);
            var workHttpClient = GetWorkHttpClient(collectionUri);
            var iterations = workHttpClient.GetTeamIterationsAsync(new TeamContext(teamProjectName)).Result;
            var workItemQueryResult = GetWorkItemQueryResult(teamProjectName, endDate, startDate, input.NtTeamMembers, witClient, iterations, out var workItemLinks);
            if (!workItemLinks.Any())
            {
                return new List<NtWorkItem>();
            }
            var ntWorkItems = GetNtWorkItems(workItemLinks, witClient, workItemQueryResult, teamProjectName, iterations, startDate, endDate);
            return ntWorkItems;
        }

        private static List<NtWorkItem> GetNtWorkItems(WorkItemLink[] workItemLinks, WorkItemTrackingHttpClient witClient,
            WorkItemQueryResult workItemQueryResult, string teamProjectName, List<TeamSettingsIteration> iterations, DateTime starDate, DateTime endDate)
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

                var title = "MISC";
                if (epicWorkItem.Fields["System.WorkItemType"].ToString().ToLower().Equals("epic"))
                {
                    title = epicWorkItem.Fields["System.Title"].ToString();
                }
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

            var skip = 0;
            var take = 100;

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
                    string closedDateString = null;
                    DateTime? closedDate = null;
                    if (taskWorkItem.Fields.ContainsKey("Microsoft.VSTS.Common.ClosedDate"))
                    {
                        closedDate = DateTime.Parse(taskWorkItem.Fields["Microsoft.VSTS.Common.ClosedDate"].ToString());
                        closedDateString = closedDate.Value.ToString("yyyy MMMM dd");
                    }
                    string iterationPath = null;
                    if (taskWorkItem.Fields.ContainsKey("System.IterationPath"))
                    {
                        iterationPath = taskWorkItem.Fields["System.IterationPath"].ToString();
                        var iteration = iterations
                            .FirstOrDefault(i => i.Path.Trim().Equals(iterationPath.Trim()));

                        if (closedDate.HasValue && iteration?.Attributes.StartDate != null && iteration.Attributes.FinishDate.HasValue)
                        {
                            if (closedDate.Value.CompareTo(iteration.Attributes.StartDate) >= 0 &&
                                closedDate.Value.CompareTo(iteration.Attributes.FinishDate) <= 0)
                            {
                                //correct case
                            }
                            else
                            {
                                closedDate = iteration.Attributes.FinishDate;
                            }

                            closedDateString = closedDate.Value.ToString("yyyy MMMM dd");
                        }
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
                        ClosedDate = closedDateString,
                        AreaPath = areaPath,
                        Duration = duration,
                        Product = product,
                        TeamProject = teamProjectName
                    };
                    ntWorkItems.Add(ntWorkItem);
                }

                skip += take;
            } while (curTaskIds.Count() == take);
            return ntWorkItems;
        }

        private static WorkItemQueryResult GetWorkItemQueryResult(string teamProjectName, DateTime endDate, DateTime startDate,
            List<NtTeamMember> ntTeamMembers, WorkItemTrackingHttpClient witClient, List<TeamSettingsIteration> iterations, out WorkItemLink[] workItemLinks)
        {
            var rangeIterations = iterations.Where(i =>
                i.Attributes.StartDate.HasValue && i.Attributes.FinishDate.HasValue &&
                ((startDate.CompareTo(i.Attributes.StartDate) <= 0 && endDate.CompareTo(i.Attributes.StartDate) >= 0) ||
                  startDate.CompareTo(i.Attributes.FinishDate) <= 0 && endDate.CompareTo(i.Attributes.FinishDate) >= 0)).ToList();

            var query =
                "Select [System.Id], [System.WorkItemType], [Microsoft.VSTS.Common.Activity], [System.Title], [System.AssignedTo], [System.State], [System.IterationPath], [Microsoft.VSTS.Common.ClosedDate], [System.AreaPath], [Nt.Duration] " +
                "From WorkItemLinks " +
                "Where (Source.[System.TeamProject] = '" + teamProjectName +
                "' and Source.[System.State] <> 'Removed' and Source.[System.WorkItemType] <> 'Task') " +
                "And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') " +
                "And (Target.[System.TeamProject] = '" + teamProjectName +
                "' and Target.[System.State] = 'Done' ";
            if (rangeIterations.Count > 0)
            {
                query += " and ( ";
                for (var i = 0; i < rangeIterations.Count; i++)
                {
                    var iteration = rangeIterations[i];
                    query += " Target.[System.IterationPath] == '" + iteration.Path + "' ";

                    if (i < rangeIterations.Count - 1)
                    {
                        query += " or ";
                    }
                }
                query += " ) ";
            }
            query += " and ";

            if (ntTeamMembers.Count > 0)
            {
                query += " ( ";

                for (var i = 0; i < ntTeamMembers.Count; i++)
                {
                    query += " Target.[System.AssignedTo] = '" + ntTeamMembers[i].UniqueName + "' ";
                    if (i < ntTeamMembers.Count - 1)
                    {
                        query += " or ";
                    }
                }

                query += " ) and ";
            }
            else
            {
                query += " Target.[System.AssignedTo] = '' and ";
            }

            query += " Target.[System.WorkItemType] = 'Task') " +
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

        private static WorkItemTrackingHttpClient GetWitClient(string collectionUri)
        {
            // Create instance of VssConnection using Windows credentials (NTLM)
            var connection = new VssConnection(new Uri(collectionUri), new VssCredentials(new WindowsCredential(true)));
            // Create instance of WorkItemTrackingHttpClient using VssConnection
            return connection.GetClient<WorkItemTrackingHttpClient>();
        }

        private static WorkHttpClient GetWorkHttpClient(string collectionUri)
        {
            // Create instance of VssConnection using Windows credentials (NTLM)
            var connection = new VssConnection(new Uri(collectionUri), new VssCredentials(new WindowsCredential(true)));
            // Create instance of WorkItemTrackingHttpClient using VssConnection
            return connection.GetClient<WorkHttpClient>();
        }

        private static int CompareWorkItemByDate(NtWorkItem x, NtWorkItem y)
        {
            if (x == null)
            {
                if (y == null)
                {
                    // If x is null and y is null, they're
                    // equal. 
                    return 0;
                }
                else
                {
                    // If x is null and y is not null, y
                    // is greater. 
                    return -1;
                }
            }
            else
            {
                // If x is not null...
                //
                if (y == null)
                    // ...and y is null, x is greater.
                {
                    return 1;
                }
                else
                {
                    var xDate = DateTime.Parse(x.ClosedDate);
                    var yDate = DateTime.Parse(y.ClosedDate);
                    return xDate.CompareTo(yDate);
                }
            }
        }
    }
}

/// <summary>
/// Helper Extension class for DateTime
/// </summary>
public static class DateTimeExtensions
{
    public static DateTime StartOfWeek(this DateTime dt, DayOfWeek startOfWeek)
    {
        int diff = (7 + (dt.DayOfWeek - startOfWeek)) % 7;
        return dt.AddDays(-1 * diff).Date;
    }

    public static DateTime EndOfWeek(this DateTime dt, DayOfWeek startOfWeek)
    {
        return StartOfWeek(dt, startOfWeek).AddDays(4).Date;
    }
}
