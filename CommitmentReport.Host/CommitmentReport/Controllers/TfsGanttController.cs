using System;
using System.Collections.Generic;
using System.Linq;
using CommitmentReport.Controllers.dto;
using CommitmentReport.Controllers.dto.gantt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.TeamFoundation.Common;
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
    [Route("api/TfsGantt")]
    public class TfsGanttController : Controller
    {
        private static readonly string URL_COLLECTION_NTCLOUD = "http://aws-tfs:8080/tfs/NtCloud";
        private static readonly string NAME_PROJECT_NTCLOUD = "NtCloud";
        private static readonly string[] FIELDS = new string[]
                                                        {
                                                            "System.Id",
                                                            "System.WorkItemType",
                                                            "System.Title",
                                                            "System.AssignedTo",
                                                            "System.State",
                                                            "System.IterationPath",
                                                            "Microsoft.VSTS.Scheduling.TargetDate",
                                                            "Microsoft.VSTS.Common.ClosedDate",
                                                            "System.CreatedDate",
                                                            "Nt.Duration"
                                                        };

        /// <summary>
        /// Get tfs Tasks by start and end date and specified users
        /// </summary>
        [HttpPost("gantt-items")]
        public List<GanttTaskDto> GetWorkItems([FromBody] GanttInput input)
        {
            var ntCloudWorkItems = GetNtWorkItemsInCollection(URL_COLLECTION_NTCLOUD, NAME_PROJECT_NTCLOUD, input);
            return ntCloudWorkItems;
        }

        private static List<GanttTaskDto> GetNtWorkItemsInCollection(string collectionUri, string teamProjectName, GanttInput input)
        {
            var witClient = GetWitClient(collectionUri);
            var workHttpClient = GetWorkHttpClient(collectionUri);
            var iterations = workHttpClient.GetTeamIterationsAsync(new TeamContext(teamProjectName)).Result;
            var workItemQueryResult = GetWorkItemQueryResult(teamProjectName, witClient, iterations, input.Start, input.End, out var workItemLinks);
            if (!workItemLinks.Any())
            {
                return new List<GanttTaskDto>();
            }
            var ntWorkItems = GetGanttTasksDto(workItemLinks, witClient, workItemQueryResult, teamProjectName, iterations);
            return ntWorkItems;
        }

        private static List<GanttTaskDto> GetGanttTasksDto(WorkItemLink[] workItemLinks, WorkItemTrackingHttpClient witClient,
            WorkItemQueryResult workItemQueryResult, string teamProjectName, List<TeamSettingsIteration> iterations)
        {
            var fields = FIELDS;
            var allIds = new List<int>();
            var idDict = new Dictionary<int, int?>();
            var reverseIdDict = new Dictionary<int, List<int>>();
            var childNumberDict = new Dictionary<int, int>();
            var progressDict = new Dictionary<int, double>();
            foreach (var workItemLink in workItemLinks)
            {
                allIds.Add(workItemLink.Target.Id);
                progressDict[workItemLink.Target.Id] = 0;
                childNumberDict[workItemLink.Target.Id] = 0;
                if (!workItemLink.Rel.IsNullOrEmpty())
                {
                    if (!reverseIdDict.ContainsKey(workItemLink.Source.Id))
                    {
                        reverseIdDict[workItemLink.Source.Id] = new List<int>();
                    }

                    reverseIdDict[workItemLink.Source.Id].Add(workItemLink.Target.Id);
                    idDict[workItemLink.Target.Id] = workItemLink.Source.Id;
                    continue;
                }
                idDict.Add(workItemLink.Target.Id, null);
            }

            foreach (var id in allIds)
            {
                if (reverseIdDict.ContainsKey(id))
                {
                    continue;
                }

                childNumberDict[id] = 0;
                var parentId = idDict[id];
                while (parentId != null)
                {
                    childNumberDict[parentId.Value]++;
                    parentId = idDict[parentId.Value];
                }
            }

            var skip = 0;
            var take = 100;

            var ganttTaskDtos = new List<GanttTaskDto>();
            int[] curTaskIds;
            do
            {
                curTaskIds = allIds.Skip(skip).Take(take).ToArray();
                var taskWorkItems = witClient.GetWorkItemsAsync(curTaskIds, fields, workItemQueryResult.AsOf).Result;

                foreach (var taskWorkItem in taskWorkItems)
                {
                    var id = int.Parse(taskWorkItem.Fields["System.Id"].ToString());
                    string workItemType = null;
                    if (taskWorkItem.Fields.ContainsKey("System.WorkItemType"))
                    {
                        workItemType = taskWorkItem.Fields["System.WorkItemType"].ToString();
                    }
                    var title = taskWorkItem.Fields["System.Title"].ToString();
                    string assignedTo = null;
                    if (taskWorkItem.Fields.ContainsKey("System.AssignedTo"))
                    {
                        assignedTo = taskWorkItem.Fields["System.AssignedTo"].ToString();
                    }
                    var state = taskWorkItem.Fields["System.State"].ToString();
                    string startDateString = null;
                    DateTime? startDate = null;
                    if (taskWorkItem.Fields.ContainsKey("System.CreatedDate"))
                    {
                        startDate = DateTime.Parse(taskWorkItem.Fields["System.CreatedDate"].ToString());
                        startDateString = startDate.Value.ToString("yyyy-MM-dd");
                    }
                    string closedDateString = null;
                    DateTime? closedDate = null;
                    if (taskWorkItem.Fields.ContainsKey("Microsoft.VSTS.Common.ClosedDate"))
                    {
                        closedDate = DateTime.Parse(taskWorkItem.Fields["Microsoft.VSTS.Common.ClosedDate"].ToString());
                        closedDateString = closedDate.Value.ToString("yyyy-MM-dd");
                    }
                    DateTime? targetDate = null;
                    string targetDateString = null;
                    if (taskWorkItem.Fields.ContainsKey("Microsoft.VSTS.Scheduling.TargetDate"))
                    {
                        targetDate = DateTime.Parse(taskWorkItem.Fields["Microsoft.VSTS.Scheduling.TargetDate"].ToString());
                        targetDateString = targetDate.Value.ToString("yyyy-MM-dd");
                    }
                    string iterationPath = null;
                    if (taskWorkItem.Fields.ContainsKey("System.IterationPath"))
                    {
                        iterationPath = taskWorkItem.Fields["System.IterationPath"].ToString();
                        var iteration = iterations
                            .FirstOrDefault(i => i.Path.Trim().Equals(iterationPath.Trim()));

                        if (iteration?.Attributes.StartDate != null && iteration.Attributes.FinishDate.HasValue)
                        {
                            if (closedDate.HasValue && workItemType != null && workItemType.ToLower().Equals("task"))
                            {
                                if (closedDate.Value.CompareTo(iteration.Attributes.StartDate) < 0 ||
                                    closedDate.Value.CompareTo(iteration.Attributes.FinishDate) > 0)
                                {
                                    closedDate = iteration.Attributes.FinishDate;
                                }
                                closedDateString = closedDate.Value.ToString("yyyy-MM-dd");
                            }

                            startDate = iteration.Attributes.StartDate;
                            startDateString = startDate.Value.ToString("yyyy-MM-dd");
                        }
                    }

                    var progress = 0;
                    if (progressDict.ContainsKey(id) && workItemType != null && workItemType.ToLower().Equals("task") && state.ToLower().Equals("done"))
                    {
                        progress = 100;
                        progressDict[id] = 100;
                        var parentId = idDict[id];
                        while (parentId != null)
                        {
                            progressDict[parentId.Value] += (100.0 / childNumberDict[parentId.Value]);
                            parentId = idDict[parentId.Value];
                        }
                    }

                    var duration = 0;
                    var unscheduled = true;
                    if (closedDate.HasValue && startDate.HasValue)
                    {
                        duration = (closedDate.Value - startDate.Value).Days;
                        unscheduled = false;
                    }
                    else if (targetDate.HasValue && startDate.HasValue)
                    {
                        duration = (targetDate.Value - startDate.Value).Days;
                        unscheduled = false;
                    }

                    ganttTaskDtos.Add(new GanttTaskDto
                    {
                        Id = id,
                        Text = title + " #" + id,
                        StartDate = startDateString,
                        Duration = duration,
                        Unscheduled = unscheduled,
                        Parent = idDict[id],
                        Progress = progress
                    });
                }

                skip += take;
            } while (curTaskIds.Count() == take);

            foreach (var t in ganttTaskDtos)
            {
                t.Progress = (int) Math.Ceiling(progressDict[t.Id]);
                if (t.Progress > 100)
                {
                    t.Progress = 100;
                }
            }

            return ganttTaskDtos;
        }

        private static WorkItemQueryResult GetWorkItemQueryResult(string teamProjectName, WorkItemTrackingHttpClient witClient, List<TeamSettingsIteration> iterations, string start, string end, out WorkItemLink[] workItemLinks)
        {
            var query =
                "Select [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [Microsoft.VSTS.Scheduling.TargetDate], [Microsoft.VSTS.Common.ClosedDate], [System.CreatedDate], [Nt.Duration] " +
                "From WorkItemLinks " +
                "Where (Source.[System.TeamProject] = '" + teamProjectName + "' ";
            if (start != null)
            {
                var startDate = DateTime.Parse(start);
                var rangeIterations = iterations.Where(i =>
                    i.Attributes.StartDate.HasValue && i.Attributes.FinishDate.HasValue &&
                    (startDate.CompareTo(i.Attributes.StartDate) <= 0)).ToList();
                query += " And ( Source.[System.CreatedDate] > '" + start + "' Or ";
                if (rangeIterations.Count > 0)
                {
                    for (var i = 0; i < rangeIterations.Count; i++)
                    {
                        var iteration = rangeIterations[i];
                        query += " Source.[System.IterationPath] == '" + iteration.Path + "' ";

                        if (i < rangeIterations.Count - 1)
                        {
                            query += " Or ";
                        }
                    }
                }
                query += " ) ";
            }
            if (end != null)
            {
                query += " And ( Source.[Microsoft.VSTS.Common.ClosedDate] < '" + end + "' Or Source.[Microsoft.VSTS.Scheduling.TargetDate] < '" + end + "' ) ";
            }
            query += " And Source.[System.WorkItemType] = 'Epic' and (Source.[System.State] = 'Done' or Source.[System.State] = 'In Progress')) " +
                "And ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') " +
                "And (Target.[System.TeamProject] = '" + teamProjectName +
                "' And [Target].[System.State] <> 'Removed'  And Target.[System.WorkItemType] <> '') ";
            query += " Order By [System.Id] mode (Recursive) ";

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
    }
}
