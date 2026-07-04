using System.Text.RegularExpressions;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.Grafana.Loki;
using Ttc.Model.Core;

namespace Ttc.WebApi.Utilities.Pipeline;

public static class SetupLogger
{
    public static void Configure(TtcSettings ttcSettings)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)

            // These two don't seem to be turning anything off?
            //.MinimumLevel.Override("Microsoft.AspNetCore.Mvc", LogEventLevel.Warning)
            //.MinimumLevel.Override("Microsoft.AspNetCore.Routing", LogEventLevel.Warning)

            // Turn off HTTP GET/POST logs:
            //.MinimumLevel.Override("Microsoft.AspNetCore.Hosting", LogEventLevel.Warning)

            // Turn everything off:
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)

            .Enrich.WithMachineName()
            .Enrich.FromLogContext()
            .WriteTo.Console(outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level}] {Message} {Properties}{NewLine}{Exception}")
            .WriteTo.File(
                "logs/log.txt",
                rollingInterval: RollingInterval.Day,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level}] {Message} {Properties}{NewLine}{Exception}",
                shared: true
            )
            .WriteTo.GrafanaLoki(
                ttcSettings.Loki,
                [
                    new LokiLabel() { Key = "service_name", Value = "ttc-backend" },
                    new LokiLabel() { Key = "app", Value = AppLabelForOrigin(ttcSettings.Origins) },
                ],
                [
                    "level",
                    "MachineName",
                    "UserName",
                    "RequestId",
                    "app",
                    "env"
                ])
            .CreateLogger();
    }

    // Loki `app` label per environment so dev/preview logs don't commingle with prod.
    // Derived from the public origin (set per Coolify tier) because Coolify does NOT
    // expose COOLIFY_BRANCH to the running container — neither via compose env (it
    // pre-substitutes ${...} to empty) nor as a build-arg value:
    //   https://ttc-aalst.be → "ttc", https://dev-ttc-aalst.sangu.be → "ttc-dev",
    //   https://pr-7-ttc-aalst.sangu.be → "ttc-pr-7".
    public static string AppLabelForOrigin(string? origins)
    {
        var host = origins?.Split(',')[0].Trim();
        if (string.IsNullOrWhiteSpace(host))
        {
            return "ttc";
        }

        host = Regex.Replace(host, @"^\w+://", "").Split('/')[0];

        var pr = Regex.Match(host, @"^pr-(\d+)-");
        if (pr.Success)
        {
            return $"ttc-pr-{pr.Groups[1].Value}";
        }

        return host.StartsWith("dev-") ? "ttc-dev" : "ttc";
    }
}
