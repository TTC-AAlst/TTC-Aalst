using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Ttc.DataAccess.Services;
using Ttc.Model.Core;
using Ttc.WebApi.Utilities;

namespace Ttc.WebApi.Controllers;

[Authorize]
[Route("api/config")]
public class ConfigController
{
    #region Constructor
    private readonly ConfigService _service;
    private readonly TtcLogger _logger;
    private readonly IHubContext<TtcHub, ITtcHub> _hub;
    private readonly IMemoryCache _cache;

    public ConfigController(ConfigService service, TtcLogger logger, IHubContext<TtcHub, ITtcHub> hub, IMemoryCache cache)
    {
        _service = service;
        _logger = logger;
        _hub = hub;
        _cache = cache;
    }
    #endregion

    [HttpGet]
    [AllowAnonymous]
    public async Task<Dictionary<string, string>?> Get([FromQuery] DateTime? lastChecked)
    {
        var config = await _service.Get(lastChecked);
        return config;
    }

    [HttpPost]
    public async Task Post([FromBody] ConfigParam param)
    {
        await _service.Save(param.Key, param.Value);
        await _hub.Clients.All.BroadcastReload(Entities.Config, 0);
    }

    [HttpPost(nameof(ClearCache))]
    public void ClearCache()
    {
        _cache.Remove("clubs");
        _cache.Remove("players");
        _cache.Remove("teams");
        _cache.Remove("config");
        _cache.Remove("ranking-predictions");
    }

    [HttpGet]
    [Route("Log/Get")]
    [AllowAnonymous]
    public string GetLogging()
    {
        string logDir = Path.Combine(Directory.GetCurrentDirectory(), "logs");
        _logger.Information("Looking for last log dir in: {logDir}", logDir);
        string fileName = Directory
            .GetFiles(logDir, "*.txt")
            .OrderByDescending(x => x)
            .First();

        _logger.Information("Current log file: {fileName}", fileName);
        return File.ReadAllText(fileName);
    }
}

public class ConfigParam
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";

    public override string ToString() => $"{Key} => {Value}";
}
