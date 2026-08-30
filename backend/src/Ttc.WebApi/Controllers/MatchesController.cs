using Frenoy.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Ttc.DataAccess.Services;
using Ttc.Model.Matches;
using Ttc.Model.Players;
using Ttc.Model.Teams;
using Ttc.WebApi.Emailing;
using Ttc.WebApi.Utilities;
using Ttc.WebApi.Utilities.Auth;

namespace Ttc.WebApi.Controllers;

[Authorize]
[Route("api/matches")]
public class MatchesController
{
    #region Constructor
    private readonly MatchService _service;
    private readonly PlayerService _playerService;
    private readonly EmailService _emailService;
    private readonly UserProvider _user;
    private readonly IHubContext<TtcHub, ITtcHub> _hub;

    public MatchesController(
        MatchService service,
        PlayerService playerService,
        EmailService emailService,
        UserProvider user,
        IHubContext<TtcHub, ITtcHub> hub)
    {
        _service = service;
        _playerService = playerService;
        _emailService = emailService;
        _user = user;
        _hub = hub;
    }
    #endregion

    #region Getters
    [HttpGet]
    [AllowAnonymous]
    public async Task<IEnumerable<Match>> Get()
    {
        var result = await _service.GetMatches();
        var cleanedResult = _user.CleanSensitiveData(result);
        return cleanedResult;
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<Match> Get(int id)
    {
        var result = await _service.GetMatch(id);
        var cleanedResult = _user.CleanSensitiveData(result);
        return cleanedResult;
    }

    [HttpGet]
    [Route("GetOpponentMatches")]
    [AllowAnonymous]
    public async Task<IEnumerable<OtherMatch>> GetOpponentMatches(int teamId, int? clubId = null, string? teamCode = null)
    {
        // This is also called from Team Week display where there is no opponent
        var opponent = clubId.HasValue ? OpposingTeam.Create(clubId, teamCode) : null;
        var result = await _service.GetOpponentMatches(teamId, opponent);
        return result;
    }

    [HttpGet("GetOpponentOne/{id:int}")]
    [AllowAnonymous]
    public async Task<OtherMatch> GetOpponentOne(int id)
    {
        var result = await _service.GetOpponentMatch(id);
        return result;
    }

    [HttpPost("GetPreviousEncounters")]
    [AllowAnonymous]
    public async Task<IEnumerable<PreviousEncounter>> GetPreviousEncounters([FromBody] PreviousEncounterRequest request)
    {
        var result = await _service.GetPreviousEncounters(request);
        return result;
    }
    #endregion



    #region Puts

    [HttpPost]
    [Route("FrenoyMatchSync")]
    [AllowAnonymous]
    public async Task<Match?> FrenoyMatchSync([FromBody] IdDto matchId, [FromQuery] bool forceSync)
    {
        var result = await _service.FrenoyMatchSync(matchId.Id, forceSync);
        if (result != null)
        {
            await _hub.Clients.All.BroadcastReload(Entities.Match, matchId.Id);
            var cleanedResult = _user.CleanSensitiveData(result);
            return cleanedResult;
        }
        return null;
    }

    [HttpPost]
    [Route("FrenoyTeamSync")]
    public async Task FrenoyTeamSync([FromBody] IdDto teamId)
    {
        await _service.FrenoyTeamSync(teamId.Id);
        // No broadcast: this is typically only used when a match will be
        // played on a different date due circumstances
    }

    [HttpPost]
    [Route("FrenoyOtherMatchSync")]
    [AllowAnonymous]
    public async Task<OtherMatch?> FrenoyOtherMatchSync([FromBody] IdDto matchId, [FromQuery] bool forceSync = false)
    {
        var result = await _service.FrenoyOtherMatchSync(matchId.Id, forceSync);
        if (result != null)
        {
            await _hub.Clients.All.BroadcastReload(Entities.ReadOnlyMatch, matchId.Id);
            return result;
        }
        return null;
    }

    [HttpPost]
    [Route("FrenoySyncTournaments")]
    [AllowAnonymous]
    public async Task FrenoySyncTournaments()
    {
        await _service.FrenoyTournamentsSync();
    }

    [HttpPost]
    [Route("TogglePlayer")]
    public async Task<ActionResult<Match>> TogglePlayer([FromBody] MatchPlayer player)
    {
        if (!await _service.MayEditFormation(player.MatchId))
        {
            return new StatusCodeResult(StatusCodes.Status403Forbidden);
        }

        var result = await _service.ToggleMatchPlayer(player);
        await _hub.Clients.All.BroadcastReload(Entities.Match, player.MatchId);
        return result;
    }

    [HttpPost]
    [Route("SetMyFormation")]
    public async Task<Match> SetMyFormation([FromBody] MatchPlayer player)
    {
        var result = await _service.SetMyFormation(player);
        await _hub.Clients.All.BroadcastReload(Entities.Match, player.MatchId);
        return result;
    }

    [HttpPost]
    [Route("EditMatchPlayers")]
    public async Task<ActionResult<Match>> EditMatchPlayers([FromBody] MatchPlayersDto dto)
    {
        if (!await _service.MayEditFormation(dto.MatchId))
        {
            return new StatusCodeResult(StatusCodes.Status403Forbidden);
        }

        var result = await _service.EditMatchPlayers(dto.MatchId, dto.PlayerIds, dto.NewStatus, dto.BlockAlso, dto.Comment);
        await _hub.Clients.All.BroadcastReload(Entities.Match, dto.MatchId);
        return result;
    }

    [HttpPost]
    [Route("EditOpponentPlayers")]
    public async Task<Match> EditOpponentPlayers([FromBody] OpponentPlayersDto dto)
    {
        var result = await _service.EditOpponentPlayers(dto.MatchId, dto.Players);
        await _hub.Clients.All.BroadcastReload(Entities.Match, dto.MatchId);
        return result;
    }

    [HttpPost]
    [Route("Report")]
    public async Task<Match> Report([FromBody] MatchReport report)
    {
        var result = await _service.UpdateReport(report);
        await _hub.Clients.All.BroadcastReload(Entities.Match, report.MatchId);
        return result;
    }

    [HttpPost]
    [Route("Comment")]
    public async Task<Match> Comment([FromBody] MatchComment comment)
    {
        var result = await _service.AddComment(comment);
        await _hub.Clients.All.BroadcastReload(Entities.Match, comment.MatchId);
        return result;
    }

    [HttpPost]
    [Route("DeleteComment")]
    public async Task<Match> DeleteComment([FromBody] IdDto comment)
    {
        var result = await _service.DeleteComment(comment.Id);
        await _hub.Clients.All.BroadcastReload(Entities.Match, result.Id);
        return result;
    }

    [HttpPost]
    [Route("UpdateScore")]
    public async Task<Match> UpdateScore([FromBody] MatchScoreDto score)
    {
        if (score.Home < 0)
        {
            score.Home = 0;
        }
        else if (score.Home > 15)
        {
            score.Home = 16;
        }

        if (score.Out < 0)
        {
            score.Out = 0;
        }
        else if (score.Out > 15)
        {
            score.Out = 16;
        }

        var result = await _service.UpdateScore(score.MatchId, new MatchScore(score.Home, score.Out));
        await _hub.Clients.All.BroadcastReload(Entities.Match, result.Id);
        return result;
    }
    #endregion

    [HttpGet]
    [Route("ExcelScoresheet/{matchId:int}")]
    public async Task<string> GetExcelExport(int matchId)
    {
        var result = await _service.GetExcelExport(matchId);
        return Convert.ToBase64String(result.file);
    }

    [HttpPost]
    [Route("WeekCompetitionEmail")]
    public async Task WeekCompetitionEmail([FromBody] WeekCompetitionEmailModel email)
    {
        var players = await _playerService.GetOwnClub(null);

        IEnumerable<Player> sendTo;
        if (email.JustMe)
        {
            sendTo = players!.Data.Where(player => player.Id == _user.PlayerId!.Value);
        }
        else
        {
            sendTo = players!.Data.Where(player => player.Active).Where(x => !string.IsNullOrWhiteSpace(x.Contact?.Email));
        }
        await _emailService.SendEmail(sendTo.ToArray(), email);
    }
}

public class MatchScoreDto
{
    public int MatchId { get; set; }
    public int Home { get; set; }
    public int Out { get; set; }

    public override string ToString() => $"MatchId: {MatchId}, Home: {Home}, Out: {Out}";
}

public class IdDto
{
    public int Id { get; set; } // oh boy
    public override string ToString() => Id.ToString();
}

public class MatchPlayersDto
{
    public bool BlockAlso { get; set; }
    public int MatchId { get; set; }
    public string NewStatus { get; set; } = "";
    public int[] PlayerIds { get; set; } = [];
    public string Comment { get; set; } = "";

    public override string ToString() => $"MatchId={MatchId}, Block={BlockAlso}, Status={NewStatus}, Players={string.Join(",", PlayerIds)}";
}

public class OpponentPlayersDto
{
    public int MatchId { get; set; }
    public ClubPlayer[] Players { get; set; } = [];

    public override string ToString() => $"MatchId={MatchId}, Players={Players.Length}";
}
