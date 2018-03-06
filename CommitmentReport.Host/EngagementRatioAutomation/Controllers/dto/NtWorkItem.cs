namespace EngagementRatioAutomation.Controllers.dto
{
    /// <summary>
    /// Work Item shown by UI filtered by the properties in the class
    /// </summary>
    public class NtWorkItem
    {
        public int Id { get; set; }

        public string WorkItemType { get; set; }

        public string Activity { get; set; }

        public string Title { get; set; }

        public string AssignedTo { get; set; }

        public string State { get; set; }
        
        public string IterationPath { get; set; }

        public string ClosedDate { get; set; }

        public string AreaPath { get; set; }

        public double? Duration { get; set; }

        public string Product { get; set; }

        public string TeamProject { get; set; }
    }
}
