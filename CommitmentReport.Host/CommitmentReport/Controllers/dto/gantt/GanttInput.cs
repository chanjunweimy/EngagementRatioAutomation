using System.Collections.Generic;

namespace CommitmentReport.Controllers.dto.gantt
{
    public class GanttInput
    {
        public string Start { get; set; }

        public string End { get; set; }

        public List<NtTeamMember> NtTeamMembers { get; set; }
    }
}
