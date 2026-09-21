using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ttc.DataAccess.Services;
using Ttc.Model.Players;

namespace Ttc.WebApi.Controllers;

[Authorize]
[Route("api/playernotes")]
public class PlayerNotesController : ControllerBase
{
    private readonly PlayerNoteService _service;

    public PlayerNotesController(PlayerNoteService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<PlayerNote[]> GetMine()
    {
        return await _service.GetMine();
    }

    /// <summary>
    /// Een lege notitie wist de bestaande: dan is er niets meer om terug te geven (204).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<PlayerNote>> Save([FromBody] PlayerNoteRequest request)
    {
        if (request.OpponentUniqueIndex <= 0)
        {
            return BadRequest();
        }

        var saved = await _service.Save(request);
        return saved == null ? NoContent() : Ok(saved);
    }

    [HttpDelete("{noteId:int}")]
    public async Task<IActionResult> Delete(int noteId)
    {
        bool deleted = await _service.Delete(noteId);
        return deleted ? Ok() : NotFound();
    }
}
