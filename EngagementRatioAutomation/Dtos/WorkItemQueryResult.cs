using System;

namespace EngagementRatioAutomation.Dtos
{
    /// <summary>
    /// TFS Work Item Query Result
    /// </summary>
    public class WorkItemQueryResult
    {
        public string QueryType { get; set; }
        public string QueryResultType { get; set; }
        public DateTime AsOf { get; set; }
        public Column[] Columns { get; set; }
        public Workitem[] WorkItems { get; set; }
    }
}
