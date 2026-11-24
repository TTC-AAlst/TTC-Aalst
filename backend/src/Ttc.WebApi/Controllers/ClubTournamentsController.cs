using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ttc.DataAccess.Services;
using Ttc.Model.ClubTournaments;
using Ttc.Model.Core;

namespace Ttc.WebApi.Controllers;

/// <summary>
/// Clubtornooien gespeeld met Tournooike (tournooike.ttc-aalst.be).
/// Tournooike stuurt een afgesloten tornooi door met het gedeelde geheim in X-Tournooike-Secret.
/// </summary>
[AllowAnonymous]
[Route("api/club-tournaments")]
public class ClubTournamentsController
{
    private readonly ClubTournamentService _service;
    private readonly TtcSettings _settings;

    public ClubTournamentsController(ClubTournamentService service, TtcSettings settings)
    {
        _service = service;
        _settings = settings;
    }

    [HttpGet]
    public async Task<ClubTournament[]> GetAll()
    {
        return await _service.GetAll();
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<ClubTournament>> Get(string slug)
    {
        var tournament = await _service.Get(slug);
        if (tournament == null)
        {
            return new NotFoundResult();
        }

        return tournament;
    }

    [HttpPost]
    public async Task<ActionResult<ClubTournament>> Push([FromHeader(Name = "X-Tournooike-Secret")] string? secret, [FromBody] JsonElement payload)
    {
        if (string.IsNullOrEmpty(_settings.TournooikeSecret))
        {
            return new StatusCodeResult(StatusCodes.Status503ServiceUnavailable);
        }

        if (!IsValidSecret(secret))
        {
            return new UnauthorizedResult();
        }

        var tournament = await _service.Upsert(payload);
        if (tournament == null)
        {
            return new BadRequestObjectResult("Ongeldig tornooi: slug, name en date (yyyy-MM-dd) zijn verplicht.");
        }

        return tournament;
    }

    private bool IsValidSecret(string? secret)
    {
        if (string.IsNullOrEmpty(secret))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(_settings.TournooikeSecret));
    }
}
