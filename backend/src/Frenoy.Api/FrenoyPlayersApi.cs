using System.Globalization;
using FrenoyVttl;
using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Players;

namespace Frenoy.Api;

public class FrenoyPlayersApi : FrenoyApiBase
{
    public FrenoyPlayersApi(ITtcDbContext ttcDbContext, Competition comp) : base(ttcDbContext, comp)
    {

    }

    public async Task StopAllPlayers(bool alsoSetQuit)
    {
        foreach (var dbPlayer in await _db.Players.Where(x => x.ClubIdVttl == Constants.OwnClubId || x.ClubIdSporta == Constants.OwnClubId).ToArrayAsync())
        {
            if (alsoSetQuit)
            {
                dbPlayer.QuitYear = _currentSeason - 1;
            }
            dbPlayer.ClubIdSporta = null;
            dbPlayer.ClubIdVttl = null;
            dbPlayer.NextRankingSporta = null;
            dbPlayer.NextRankingVttl = null;
        }
        await _db.SaveChangesAsync();
    }

    public async Task SyncPlayers()
    {
        var frenoyPlayers = await _frenoy.GetMembersAsync(new GetMembersRequest1
        {
            GetMembersRequest = new GetMembersRequest()
            {
                Season = (_currentSeason - 2000 + 1).ToString(),
                Club = _settings.FrenoyClub,
            }
        });

        foreach (MemberEntryType frenoyPlayer in frenoyPlayers.GetMembersResponse.MemberEntries)
        {
            string frenoyFirstName = frenoyPlayer.FirstName!.ToUpperInvariant();
            string frenoyLastName = frenoyPlayer.LastName!.ToUpperInvariant();
            var existingPlayer = await _db.Players.SingleOrDefaultAsync(ply => ply.FirstName!.ToUpper() == frenoyFirstName && ply.LastName!.ToUpper() == frenoyLastName);
            if (_isVttl)
            {
                existingPlayer ??= await _db.Players.SingleOrDefaultAsync(ply => ply.ComputerNummerVttl.HasValue && ply.ComputerNummerVttl.Value.ToString() == frenoyPlayer.UniqueIndex);

                if (existingPlayer != null)
                {
                    SetVttl(existingPlayer, frenoyPlayer);
                }
                else
                {
                    await CreatePlayerEntity(frenoyPlayer);
                }
            }
            else
            {
                existingPlayer ??= await _db.Players.SingleOrDefaultAsync(ply => ply.LidNummerSporta.HasValue && ply.LidNummerSporta.Value.ToString() == frenoyPlayer.UniqueIndex);

                if (existingPlayer != null)
                {
                    SetSporta(existingPlayer, frenoyPlayer);
                }
                else
                {
                    await CreatePlayerEntity(frenoyPlayer);
                }
            }
        }

        await _db.SaveChangesAsync();
    }

    private static void SetVttl(PlayerEntity player, MemberEntryType frenoyPlayer)
    {
        player.QuitYear = null;

        player.IndexVttl = int.Parse(frenoyPlayer.RankingIndex);
        player.VolgnummerVttl = int.Parse(frenoyPlayer.Position);
        player.ClubIdVttl = Constants.OwnClubId;
        player.RankingVttl = frenoyPlayer.Ranking;
        player.ComputerNummerVttl = int.Parse(frenoyPlayer.UniqueIndex);
        player.NextRankingVttl = null;
    }

    private async Task<PlayerEntity> CreatePlayerEntity(MemberEntryType frenoyPlayer)
    {
        var existingPlayer = await _db.Players.SingleOrDefaultAsync(x => x.FirstName!.ToUpper() == frenoyPlayer.FirstName && x.LastName!.ToUpper() == frenoyPlayer.LastName);
        bool isNew = existingPlayer == null;
        if (isNew)
        {
            existingPlayer = CreatePlayerEntityCore(frenoyPlayer);
        }

        if (_isVttl)
        {
            SetVttl(existingPlayer!, frenoyPlayer);
        }
        else
        {
            SetSporta(existingPlayer!, frenoyPlayer);
        }

        if (isNew)
        {
            _db.Players.Add(existingPlayer!);
            await _db.SaveChangesAsync();
        }

        return existingPlayer!;
    }

    private static PlayerEntity CreatePlayerEntityCore(MemberEntryType frenoyPlayer)
    {
        var newPlayer = new PlayerEntity
        {
            FirstName = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(frenoyPlayer.FirstName.ToLowerInvariant()),
            LastName = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(frenoyPlayer.LastName.ToLowerInvariant())
        };
        newPlayer.Alias = newPlayer.Name;
        newPlayer.Security = PlayerAccess.Player;
        newPlayer.Email = frenoyPlayer.Email;
        if (frenoyPlayer.Phone != null)
        {
            newPlayer.Mobile = frenoyPlayer.Phone.Mobile;
        }

        if (frenoyPlayer.Address != null)
        {
            newPlayer.Address = frenoyPlayer.Address.Line1;
            newPlayer.City = frenoyPlayer.Address.ZipCode + " " + frenoyPlayer.Address.Town;
        }

        return newPlayer;
    }

    private static void SetSporta(PlayerEntity player, MemberEntryType frenoyPlayer)
    {
        player.QuitYear = null;

        player.IndexSporta = int.Parse(frenoyPlayer.RankingIndex);
        player.VolgnummerSporta = int.Parse(frenoyPlayer.Position);
        player.ClubIdSporta = Constants.OwnClubId;
        player.RankingSporta = frenoyPlayer.Ranking;
        player.LidNummerSporta = int.Parse(frenoyPlayer.UniqueIndex);
        //player.LinkKaartSporta
        player.NextRankingSporta = null;
    }

    public async Task<ICollection<PlayerEntity>> GetPlayers(int clubId)
    {
        var club = await _db.Clubs.FindAsync(clubId);
        var frenoyPlayers = await _frenoy.GetMembersAsync(new GetMembersRequest1
        {
            GetMembersRequest = new GetMembersRequest()
            {
                Club = club?.CodeSporta,
            }
        });

        var players = frenoyPlayers.GetMembersResponse.MemberEntries
            .Select(frenoyPlayer =>
            {
                var ply = CreatePlayerEntityCore(frenoyPlayer);
                if (_isVttl)
                {
                    SetVttl(ply, frenoyPlayer);
                }
                else
                {
                    SetSporta(ply, frenoyPlayer);
                }

                return ply;
            })
            .ToArray();

        return players;
    }

    public async Task<ICollection<ClubPlayer>> GetMembersAsync(string clubCode)
    {
        var frenoyPlayers = await _frenoy.GetMembersAsync(new GetMembersRequest1
        {
            GetMembersRequest = new GetMembersRequest()
            {
                Club = clubCode,
                Season = (_currentSeason - 2000 + 1).ToString(),
            }
        });

        return frenoyPlayers.GetMembersResponse.MemberEntries
            .Select(p => new ClubPlayer(
                CultureInfo.InvariantCulture.TextInfo.ToTitleCase($"{p.FirstName} {p.LastName}".ToLowerInvariant()),
                p.Ranking,
                int.Parse(p.UniqueIndex)
            ))
            .ToArray();
    }

    /// <summary>
    /// Zoekt op naam in de VTTL ledenlijst van dit en de vorige seizoenen,
    /// om te bepalen of het een eerste aansluiting of een heraansluiting is.
    /// Zonder PlayerCategory geeft Frenoy enkel de heren terug.
    /// </summary>
    public async Task<ICollection<VttlMember>> SearchMembersAsync(string name, int seasonsBack)
    {
        int currentFrenoySeason = _currentSeason - 2000 + 1;
        string[] categories = ["1", "2"];
        var requests = Enumerable.Range(0, seasonsBack + 1)
            .Select(back => currentFrenoySeason - back)
            .SelectMany(season => categories.Select(category => SearchMembersAsync(name, season, category)));

        var results = await Task.WhenAll(requests);
        return results
            .SelectMany(x => x)
            .GroupBy(x => x.UniqueIndex)
            .Select(x => x.MaxBy(member => member.Season)!)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToArray();
    }

    private async Task<VttlMember[]> SearchMembersAsync(string name, int season, string category)
    {
        try
        {
            var response = await _frenoy.GetMembersAsync(new GetMembersRequest1
            {
                GetMembersRequest = new GetMembersRequest()
                {
                    NameSearch = name,
                    Season = season.ToString(),
                    PlayerCategory = category,
                }
            });

            return (response.GetMembersResponse.MemberEntries ?? [])
                .Select(p => new VttlMember(
                    int.Parse(p.UniqueIndex),
                    p.FirstName ?? "",
                    p.LastName ?? "",
                    p.Ranking ?? "",
                    p.Club ?? "",
                    p.GenderSpecified ? (p.Gender == GenderType.M ? "M" : "V") : null,
                    p.BirthDateSpecified ? p.BirthDate : null,
                    season
                ))
                .ToArray();
        }
        catch (System.ServiceModel.FaultException)
        {
            // Frenoy geeft een fault wanneer niemand gevonden wordt
            return [];
        }
    }
}

public record ClubPlayer(string Name, string Ranking, int UniqueIndex);
