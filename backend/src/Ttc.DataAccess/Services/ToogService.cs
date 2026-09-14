using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;

namespace Ttc.DataAccess.Services;

public class ToogService
{
    private readonly ITtcDbContext _context;
    private readonly IUserProvider _userProvider;

    public ToogService(ITtcDbContext context, IUserProvider userProvider)
    {
        _context = context;
        _userProvider = userProvider;
    }

    /// <summary>
    /// Komende dagen waarop minstens één van onze ploegen thuis speelt, met de betrokken ploegen.
    /// Afgeleid uit de kalender: een toogbeurt heeft geen eigen kalenderrecord.
    /// </summary>
    private async Task<Dictionary<DateTime, int[]>> GetHomeDays()
    {
        int currentFrenoySeason = _context.CurrentFrenoySeason;
        var today = TtcDbContext.GetCurrentBelgianDateTime().Date;

        var matches = await _context.Matches
            .Where(x => x.FrenoySeason == currentFrenoySeason)
            .Where(x => x.ShouldBePlayed)
            .Where(x => x.HomeTeamId != null)
            .Where(x => x.Date >= today)
            .Select(x => new { x.Date, HomeTeamId = x.HomeTeamId!.Value })
            .ToArrayAsync();

        return matches
            .GroupBy(x => x.Date.Date)
            .OrderBy(x => x.Key)
            .ToDictionary(x => x.Key, x => x.Select(m => m.HomeTeamId).Distinct().OrderBy(id => id).ToArray());
    }

    public async Task<bool> IsBoardMember()
    {
        int? playerId = _userProvider.PlayerId;
        if (!playerId.HasValue)
        {
            return false;
        }

        var player = await _context.Players.FindAsync(playerId.Value);
        return player != null && player.Security != PlayerAccess.Player;
    }
}
