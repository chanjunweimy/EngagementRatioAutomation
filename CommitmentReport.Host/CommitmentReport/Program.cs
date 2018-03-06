using System.Diagnostics;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.WindowsServices;
using Microsoft.AspNetCore.Server.HttpSys;
using Microsoft.Extensions.Configuration;

namespace CommitmentReport
{
    public class Program
    {
        public static void Main(string[] args)
        {
            bool isService = true;
            if (Debugger.IsAttached || args.Contains("--console"))
            {
                isService = false;
            }

            var host = BuildWebHost(args, isService);

            if (isService)
            {
                host.RunAsService();
            }
            else
            {
                host.Run();
            }
        }

        public static IWebHost BuildWebHost(string[] args, bool isService)
        {
            var configuration = new ConfigurationBuilder()
                                .AddCommandLine(args)
                                .Build();

            if (args.Length == 0)
            {
                configuration = new ConfigurationBuilder()
                                .SetBasePath(Directory.GetCurrentDirectory())
                                .AddJsonFile("hosting.json", true)
                                .Build();
            }

            var pathToContentRoot = Directory.GetCurrentDirectory();
            if (isService)
            {
                var pathToExe = Process.GetCurrentProcess().MainModule.FileName;
                pathToContentRoot = Path.GetDirectoryName(pathToExe);
            }

            return WebHost.CreateDefaultBuilder(args)
#if HTTP_SYS
                .UseHttpSys(options =>
                {
                    options.Authentication.Schemes =
                        AuthenticationSchemes.NTLM | AuthenticationSchemes.Negotiate;
                    options.Authentication.AllowAnonymous = false;
                })
#endif
                .UseContentRoot(pathToContentRoot)
                .UseConfiguration(configuration)
                .UseStartup<Startup>()
                .Build();
        }
    }
}
