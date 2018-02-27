using System.Collections.Generic;

namespace EngagementRatioAutomation.Controllers.dto
{
    public class WorkItemInput
    {
        public string Start { get; set; }

        public string End { get; set; }

        public List<NtTeamMember> NtTeamMembers { get; set; }
    }
}
