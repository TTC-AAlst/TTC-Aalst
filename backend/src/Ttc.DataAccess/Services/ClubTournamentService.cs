using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.ClubTournaments;

namespace Ttc.DataAccess.Services;

public class ClubTournamentService
{
    private readonly ITtcDbContext _context;

    public ClubTournamentService(ITtcDbContext context)
    {
        _context = context;
    }

    public async Task<ClubTournament[]> GetAll()
    {
        var entities = await _context.ClubTournaments
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Id)
            .ToArrayAsync();
        return entities.Select(Map).ToArray();
    }

    public async Task<ClubTournament?> Get(string slug)
    {
        var entity = await _context.ClubTournaments.SingleOrDefaultAsync(x => x.Slug == slug);
        return entity == null ? null : Map(entity);
    }

    /// <summary>
    /// Bewaart een doorgestuurd tornooi. Hetzelfde tornooi (slug) opnieuw doorsturen overschrijft het.
    /// </summary>
    /// <returns>null wanneer de payload geen geldig tornooi is.</returns>
    public async Task<ClubTournament?> Upsert(JsonElement payload)
    {
        if (payload.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        string? slug = GetString(payload, "slug");
        string? name = GetString(payload, "name");
        string? dateValue = GetString(payload, "date");
        if (string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(dateValue))
        {
            return null;
        }

        if (!DateTime.TryParseExact(dateValue, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return null;
        }

        var entity = await _context.ClubTournaments.SingleOrDefaultAsync(x => x.Slug == slug);
        if (entity == null)
        {
            entity = new ClubTournamentEntity { Slug = Truncate(slug, 100) };
            _context.ClubTournaments.Add(entity);
        }

        entity.Name = Truncate(name, 255);
        entity.EventType = Truncate(GetString(payload, "eventType") ?? "", 100);
        entity.Type = Truncate(GetString(payload, "type") ?? "", 20);
        entity.Date = date;
        entity.Url = Truncate(GetString(payload, "url") ?? "", 500);
        entity.Winner = GetWinner(payload);
        entity.Payload = payload.GetRawText();
        entity.ReceivedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Map(entity);
    }

    private static string? GetWinner(JsonElement payload)
    {
        if (!payload.TryGetProperty("top4", out var top4) || top4.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var winners = top4.EnumerateArray()
            .Where(x => x.TryGetProperty("place", out var place) && place.ValueKind == JsonValueKind.Number && place.GetInt32() == 1)
            .Select(x => GetString(x, "name"))
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToArray();
        return winners.Length == 0 ? null : Truncate(string.Join(" / ", winners), 255);
    }

    private static string? GetString(JsonElement element, string property)
    {
        return element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static string Truncate(string value, int length) => value.Length <= length ? value : value[..length];

    private static ClubTournament Map(ClubTournamentEntity entity)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrEmpty(entity.Payload) ? "{}" : entity.Payload);
        return new ClubTournament
        {
            Id = entity.Id,
            Slug = entity.Slug,
            Name = entity.Name,
            EventType = entity.EventType,
            Type = entity.Type,
            Date = entity.Date,
            Winner = entity.Winner,
            Url = entity.Url,
            ReceivedAt = entity.ReceivedAt,
            Results = doc.RootElement.Clone(),
        };
    }
}
