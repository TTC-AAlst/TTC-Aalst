using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Toog;

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
    private async Task<SortedDictionary<DateTime, int[]>> GetHomeDays()
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

        return new SortedDictionary<DateTime, int[]>(matches
            .GroupBy(x => x.Date.Date)
            .ToDictionary(x => x.Key, x => x.Select(m => m.HomeTeamId).Distinct().OrderBy(id => id).ToArray()));
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

    public async Task<ToogDay[]> GetMine()
    {
        int playerId = _userProvider.PlayerId ?? throw new InvalidOperationException("Not logged in");
        var homeDays = await GetHomeDays();
        var mine = await _context.Toog.Where(x => x.PlayerId == playerId).ToArrayAsync();

        return homeDays
            .Select(day => new ToogDay
            {
                Date = day.Key,
                HomeTeamIds = day.Value,
                Available = mine.Any(x => x.Date == day.Key),
                Assigned = mine.Any(x => x.Date == day.Key && x.Assigned),
            })
            .ToArray();
    }

    /// <summary>
    /// Mag de ingelogde speler zijn beschikbaarheid voor deze dag nog wijzigen?
    /// Nee zodra hij is aangeduid: dan moet het bestuur eerst iemand anders kiezen.
    /// </summary>
    public async Task<bool> MaySetMine(DateTime date, bool available)
    {
        int? playerId = _userProvider.PlayerId;
        if (!playerId.HasValue)
        {
            return false;
        }

        var day = date.Date;
        var homeDays = await GetHomeDays();
        if (!homeDays.ContainsKey(day))
        {
            return false;
        }

        if (available)
        {
            return true;
        }

        var existing = await _context.Toog.SingleOrDefaultAsync(x => x.PlayerId == playerId.Value && x.Date == day);
        return existing == null || !existing.Assigned;
    }

    public async Task<ToogDay[]> SetMine(DateTime date, bool available)
    {
        int playerId = _userProvider.PlayerId ?? throw new InvalidOperationException("Not logged in");
        var day = date.Date;
        var existing = await _context.Toog.SingleOrDefaultAsync(x => x.PlayerId == playerId && x.Date == day);

        if (available && existing == null)
        {
            _context.Toog.Add(new ToogEntity { Date = day, PlayerId = playerId, Volunteered = true });
        }
        else if (!available && existing != null)
        {
            _context.Toog.Remove(existing);
        }

        await _context.SaveChangesAsync();
        return await GetMine();
    }
}
