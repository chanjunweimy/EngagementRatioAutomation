namespace CommitmentReport.Controllers.dto.gantt
{
    public class GanttTaskDto
    {
        public int Id { get; set; }

        public string StartDate { get; set; }

        public string Text { get; set; }

        public string State { get; set; }

        public int Progress { get; set; }

        public int Duration { get; set; }

        public int? Parent { get; set; }

        public bool Unscheduled { get; set; }
    }
}
