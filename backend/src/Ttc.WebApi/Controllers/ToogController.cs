using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ttc.DataAccess.Services;
using Ttc.Model.Toog;

namespace Ttc.WebApi.Controllers;

[Authorize]
[Route("api/toog")]
public class ToogController
{
    private readonly ToogService _service;

    public ToogController(ToogService service)
    {
        _service = service;
    }

    [HttpGet("mine")]
    public async Task<ToogDay[]> GetMine()
    {
        return await _service.GetMine();
    }

    [HttpPost("mine")]
    public async Task<ActionResult<ToogDay[]>> SetMine([FromBody] ToogAvailabilityRequest request)
    {
        if (!await _service.MaySetMine(request.Date, request.Available))
        {
            return new StatusCodeResult(StatusCodes.Status403Forbidden);
        }

        return await _service.SetMine(request.Date, request.Available);
    }
}
