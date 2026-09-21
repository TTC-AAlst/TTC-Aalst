using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Ttc.DataEntities.Core;

public interface ITtcDbContext : IAsyncDisposable
{
    DbSet<PlayerEntity> Players { get; set; }
    DbSet<PlayerLoginEntity> PlayerLogins { get; set; }
    DbSet<PlayerPasswordResetEntity> PlayerPasswordResets { get; set; }
    DbSet<PlayerNoteEntity> PlayerNotes { get; set; }

    DbSet<ClubEntity> Clubs { get; set; }
    DbSet<ClubLocationEntity> ClubLocations { get; set; }
    DbSet<ClubManagerEntity> ClubManagers { get; set; }

    DbSet<TeamEntity> Teams { get; set; }
    DbSet<TeamOpponentEntity> TeamOpponents { get; set; }
    DbSet<TeamPlayerEntity> TeamPlayers { get; set; }

    DbSet<MatchEntity> Matches { get; set; }
    DbSet<MatchPlayerEntity> MatchPlayers { get; set; }
    DbSet<MatchGameEntity> MatchGames { get; set; }
    DbSet<MatchCommentEntity> MatchComments { get; set; }
    DbSet<TournamentEntity> Tournaments { get; set; }
    DbSet<DivisionRankingWeekEntity> DivisionRankingWeeks { get; set; }

    DbSet<ParameterEntity> Parameters { get; set; }
    DbSet<EventEntity> Events { get; set; }
    DbSet<ToogEntity> Toog { get; set; }

    int CurrentSeason { get; set; }
    int CurrentFrenoySeason { get; }

    Task<int> SaveChangesAsync(CancellationToken token = default);

    EntityEntry<TEntity> Entry<TEntity>(TEntity entity)
        where TEntity : class;

    DatabaseFacade Database { get; }
}
