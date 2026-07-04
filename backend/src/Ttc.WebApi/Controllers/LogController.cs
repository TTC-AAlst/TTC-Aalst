using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog.Context;

namespace Ttc.WebApi.Controllers;

[AllowAnonymous]
[Route("api/log")]
public class LogController : ControllerBase
{
    private readonly Serilog.ILogger _logger;

    public LogController(Serilog.ILogger logger) => _logger = logger;

    [HttpPost]
    public IActionResult Post([FromBody] FrontendLogBatch batch)
    {
        foreach (var entry in batch.Entries.Take(200))
        {
            using (LogContext.PushProperty("source", "frontend"))
            using (LogContext.PushProperty("SessionId", batch.SessionId))
            using (LogContext.PushProperty("Route", entry.Route))
            using (LogContext.PushProperty("AppVersion", batch.AppVersion))
            using (LogContext.PushProperty("Env", batch.Env))
            using (LogContext.PushProperty("UserAgent", batch.UserAgent))
            using (LogContext.PushProperty("IsMobile", batch.IsMobile))
            using (LogContext.PushProperty("Fields", entry.Fields?.GetRawText()))
            using (LogContext.PushProperty("ClientTs", entry.Ts))
            {
                switch (entry.Level)
                {
                    case "error":
                        _logger.Error("{FrontendMessage}", entry.Message);
                        break;
                    case "warn":
                        _logger.Warning("{FrontendMessage}", entry.Message);
                        break;
                    default:
                        _logger.Information("{FrontendMessage}", entry.Message);
                        break;
                }
            }
        }
        return Ok();
    }
}

public class FrontendLogBatch
{
    public string SessionId { get; set; } = "";
    public string AppVersion { get; set; } = "";
    public string Env { get; set; } = "";
    public string UserAgent { get; set; } = "";
    public bool IsMobile { get; set; }
    public List<FrontendLogEntry> Entries { get; set; } = new();
}

public class FrontendLogEntry
{
    public string Level { get; set; } = "info";
    public string Message { get; set; } = "";
    public string Route { get; set; } = "";
    public string Ts { get; set; } = "";
    public JsonElement? Fields { get; set; }
}
