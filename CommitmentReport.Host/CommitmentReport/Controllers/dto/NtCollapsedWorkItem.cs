using System.Collections.Generic;

namespace CommitmentReport.Controllers.dto
{
    public class NtCollapsedWorkItem
    {
        public string Employee { get; set; }

        public string Date { get; set; }
        
        public string Title { get; set; }

        //public double DurationDemonstration { get; set; }

        public double DurationDeployment { get; set; }

        public double DurationDesign { get; set; }

        public double DurationDevelopment { get; set; }

        public double DurationDocumentation { get; set; }

        public double DurationMarketing { get; set; }

        public double DurationRequirements { get; set; }

        public double DurationTesting { get; set; }

        public double DurationOthers { get; set; }

        public double DurationNA { get; set; }

        public double DurationTotal { get; set; }

        public Dictionary<string, double> Product { get; set; }

        public List<string> WorkTasksList { get; set; }
    }
}
