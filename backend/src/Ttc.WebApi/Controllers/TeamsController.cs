using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Ttc.DataAccess.Services;
using Ttc.Model.Clubs;
using Ttc.Model.Players;
using Ttc.Model.Teams;
using Ttc.WebApi.Utilities;

namespace Ttc.WebApi.Controllers;

[Authorize]
[Route("api/teams")]
public class TeamsController
{
    #region Constructor
    private readonly TeamService _service;
    private readonly IHubContext<TtcHub, ITtcHub> _hub;

    public TeamsController(TeamService service, IHubContext<TtcHub, ITtcHub> hub)
    {
        _service = service;
        _hub = hub;
    }
    #endregion

    [HttpGet]
    [AllowAnonymous]
    public async Task<CacheResponse<Team>?> Get([FromQuery] DateTime? lastChecked)
    {
        var result = await _service.GetForCurrentYear(lastChecked);
        return result;
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<Team> Get(int id)
    {
        return await _service.GetTeam(id);
    }

    [HttpGet]
    [AllowAnonymous]
    [Route("Ranking/{competition}/{divisionId:int}")]
    public async Task<IEnumerable<DivisionRanking>> Ranking(Competition competition, int divisionId)
    {
        return await _service.GetTeamRanking(competition, divisionId);
    }

    [HttpGet]
    [AllowAnonymous]
    [Route("RankingHistory/{competition}/{divisionId:int}")]
    public async Task<IEnumerable<DivisionRankingWeek>> RankingHistory(Competition competition, int divisionId)
    {
        return await _service.GetRankingHistory(competition, divisionId);
    }

    [HttpGet]
    [AllowAnonymous]
    [Route("RankingHistoryPositions")]
    public async Task<IEnumerable<TeamPositionWeek>> RankingHistoryPositions()
    {
        return await _service.GetOwnTeamPositions();
    }

    [HttpPost]
    [Route("ToggleTeamPlayer")]
    public async Task<Team> ToggleTeamPlayer([FromBody] TeamToggleRequest req)
    {
        var result = await _service.ToggleTeamPlayer(req);
        await _hub.Clients.All.BroadcastReload(Entities.Team, req.TeamId);
        return result;
    }

    [HttpGet]
    [Route("ExcelExport")]
    public async Task<string> GetExcelExport()
    {
        var excel = await _service.GetExcelExport();
        return Convert.ToBase64String(excel);
    }
}
