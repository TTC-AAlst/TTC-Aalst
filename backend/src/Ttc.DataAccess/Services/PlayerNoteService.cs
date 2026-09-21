using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Players;

namespace Ttc.DataAccess.Services;

/// <summary>
/// Notities over tegenstanders. Een notitie is strikt persoonlijk:
/// elke query filtert op de ingelogde speler.
/// </summary>
public class PlayerNoteService
{
    public const int MaxNoteLength = 10000;

    private readonly ITtcDbContext _context;
    private readonly IUserProvider _userProvider;

    public PlayerNoteService(ITtcDbContext context, IUserProvider userProvider)
    {
        _context = context;
        _userProvider = userProvider;
    }

    private int CurrentPlayerId => _userProvider.PlayerId ?? throw new InvalidOperationException("Not logged in");

    public async Task<PlayerNote[]> GetMine()
    {
        int playerId = CurrentPlayerId;
        var notes = await _context.PlayerNotes
            .Where(x => x.PlayerId == playerId)
            .ToArrayAsync();

        return notes.Select(Map).ToArray();
    }

    /// <summary>
    /// Maakt de notitie aan of overschrijft de bestaande voor deze tegenstander.
    /// Een lege notitie wist de bestaande rij.
    /// </summary>
    public async Task<PlayerNote?> Save(PlayerNoteRequest request)
    {
        int playerId = CurrentPlayerId;
        var existing = await _context.PlayerNotes
            .SingleOrDefaultAsync(x => x.PlayerId == playerId
                && x.Competition == request.Competition
                && x.OpponentUniqueIndex == request.OpponentUniqueIndex);

        string note = request.Note.Trim();
        if (note.Length == 0)
        {
            if (existing != null)
            {
                _context.PlayerNotes.Remove(existing);
                await _context.SaveChangesAsync();
            }
            return null;
        }

        if (note.Length > MaxNoteLength)
        {
            note = note[..MaxNoteLength];
        }

        if (existing == null)
        {
            existing = new PlayerNoteEntity
            {
                PlayerId = playerId,
                Competition = request.Competition,
                OpponentUniqueIndex = request.OpponentUniqueIndex,
            };
            _context.PlayerNotes.Add(existing);
        }

        existing.OpponentName = request.OpponentName.Length > 50 ? request.OpponentName[..50] : request.OpponentName;
        existing.Note = note;
        await _context.SaveChangesAsync();

        return Map(existing);
    }

    public async Task<bool> Delete(int noteId)
    {
        int playerId = CurrentPlayerId;
        var existing = await _context.PlayerNotes.SingleOrDefaultAsync(x => x.Id == noteId && x.PlayerId == playerId);
        if (existing == null)
        {
            return false;
        }

        _context.PlayerNotes.Remove(existing);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PlayerNote Map(PlayerNoteEntity entity) => new()
    {
        Id = entity.Id,
        Competition = entity.Competition,
        OpponentUniqueIndex = entity.OpponentUniqueIndex,
        OpponentName = entity.OpponentName,
        Note = entity.Note,
        ModifiedOn = entity.Audit.ModifiedOn ?? entity.Audit.CreatedOn,
    };
}
