using Frenoy.Api;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Ttc.DataAccess.Utilities;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Players;

namespace Ttc.DataAccess.Services;

/// <summary>
/// VTTL aansluitingsformulieren: persoonsgegevens en opzoeken in de VTTL ledenlijst.
/// Enkel voor het bestuur.
/// </summary>
public class MembershipService
{
    private const int SeasonsBack = 5;
    private readonly ITtcDbContext _context;
    private readonly IUserProvider _userProvider;
    private readonly CacheHelper _cache;

    public MembershipService(ITtcDbContext context, IUserProvider userProvider, IMemoryCache cache)
    {
        _context = context;
        _userProvider = userProvider;
        _cache = new CacheHelper(cache);
    }

    public async Task<bool> IsBoard()
    {
        if (_userProvider.PlayerId is not { } playerId)
        {
            return false;
        }

        var security = await _context.Players
            .Where(x => x.Id == playerId)
            .Select(x => x.Security)
            .SingleOrDefaultAsync();
        return security is PlayerAccess.Board or PlayerAccess.Dev;
    }

    public async Task<PlayerMembership> Get(int playerId)
    {
        var entity = await _context.PlayerMemberships.FindAsync(playerId);
        return entity == null ? new PlayerMembership { PlayerId = playerId } : Map(entity);
    }

    public async Task<PlayerMembership?> Save(PlayerMembership membership)
    {
        var player = await _context.Players.FindAsync(membership.PlayerId);
        if (player == null)
        {
            return null;
        }

        var entity = await _context.PlayerMemberships.FindAsync(membership.PlayerId);
        if (entity == null)
        {
            entity = new PlayerMembershipEntity { PlayerId = membership.PlayerId };
            await _context.PlayerMemberships.AddAsync(entity);
        }

        Map(membership, entity);
        SyncContact(entity, player);

        await _context.SaveChangesAsync();
        _cache.Remove("players");
        return Map(entity);
    }

    public async Task<ICollection<VttlMember>> SearchVttl(string name)
    {
        var api = new FrenoyPlayersApi(_context, Competition.Vttl);
        return await api.SearchMembersAsync(name.Trim(), SeasonsBack);
    }

    /// <summary>
    /// Het adres op de speler blijft de bron voor de rest van de site
    /// </summary>
    internal static void SyncContact(PlayerMembershipEntity src, PlayerEntity player)
    {
        if (!string.IsNullOrWhiteSpace(src.Street))
        {
            string bus = string.IsNullOrWhiteSpace(src.Bus) ? "" : $" bus {src.Bus.Trim()}";
            player.Address = $"{src.Street.Trim()} {src.HouseNumber?.Trim()}".Trim() + bus;
        }
        if (!string.IsNullOrWhiteSpace(src.Town))
        {
            player.City = $"{src.PostalCode?.Trim()} {src.Town.Trim()}".Trim();
        }
    }

    private static void Map(PlayerMembership src, PlayerMembershipEntity target)
    {
        target.Status = src.Status;
        target.BirthDate = src.BirthDate?.Date;
        target.Gender = src.Gender;
        target.Nationality = src.Nationality;
        target.ResidentInBelgiumSince = src.ResidentInBelgiumSince;
        target.Street = src.Street;
        target.HouseNumber = src.HouseNumber;
        target.Bus = src.Bus;
        target.PostalCode = src.PostalCode;
        target.Town = src.Town;
        target.Phone = src.Phone;
        target.GSporter = src.GSporter;
        target.ParentEmail1 = src.ParentEmail1;
        target.ParentEmail2 = src.ParentEmail2;
        target.OtherFederationRanking = src.OtherFederationRanking;
        target.OtherFederation = src.OtherFederation;
        target.LastVttlSeason = src.LastVttlSeason;
    }

    private static PlayerMembership Map(PlayerMembershipEntity src)
    {
        return new PlayerMembership
        {
            PlayerId = src.PlayerId,
            Status = src.Status,
            BirthDate = src.BirthDate,
            Gender = src.Gender,
            Nationality = src.Nationality,
            ResidentInBelgiumSince = src.ResidentInBelgiumSince,
            Street = src.Street,
            HouseNumber = src.HouseNumber,
            Bus = src.Bus,
            PostalCode = src.PostalCode,
            Town = src.Town,
            Phone = src.Phone,
            GSporter = src.GSporter,
            ParentEmail1 = src.ParentEmail1,
            ParentEmail2 = src.ParentEmail2,
            OtherFederationRanking = src.OtherFederationRanking,
            OtherFederation = src.OtherFederation,
            LastVttlSeason = src.LastVttlSeason,
        };
    }
}
