using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MimeKit;
using Ttc.DataAccess.Services;
using Ttc.Model.Players;
using Ttc.WebApi.Emailing;

namespace Ttc.WebApi.Controllers;

/// <summary>
/// VTTL aansluitingsformulieren: enkel voor het bestuur
/// </summary>
[Authorize]
[Route("api/membership")]
public class MembershipController : ControllerBase
{
    private readonly MembershipService _service;
    private readonly EmailService _emailService;

    public MembershipController(MembershipService service, EmailService emailService)
    {
        _service = service;
        _emailService = emailService;
    }

    [HttpGet("{playerId:int}")]
    public async Task<ActionResult<PlayerMembership>> Get(int playerId)
    {
        if (!await _service.IsBoard())
        {
            return Forbid();
        }
        return await _service.Get(playerId);
    }

    [HttpPost]
    public async Task<ActionResult<PlayerMembership>> Save([FromBody] PlayerMembership membership)
    {
        if (!await _service.IsBoard())
        {
            return Forbid();
        }

        var result = await _service.Save(membership);
        return result == null ? NotFound() : result;
    }

    [HttpGet("Vttl")]
    public async Task<ActionResult<ICollection<VttlMember>>> SearchVttl([FromQuery] string name)
    {
        if (!await _service.IsBoard())
        {
            return Forbid();
        }
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 3)
        {
            return BadRequest();
        }

        var result = await _service.SearchVttl(name);
        return Ok(result);
    }

    [HttpPost("Email")]
    public async Task<IActionResult> Email([FromBody] MembershipEmailModel email)
    {
        if (!await _service.IsBoard())
        {
            return Forbid();
        }
        if (email.To.Length == 0 || email.To.Concat(email.Cc).Any(x => !MailboxAddress.TryParse(x, out _)))
        {
            return BadRequest();
        }

        await _emailService.SendEmail(email);
        return Ok();
    }
}
