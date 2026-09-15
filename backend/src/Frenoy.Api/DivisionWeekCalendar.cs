namespace Frenoy.Api;

/// <summary>
/// A division's own calendar, read off its matches: which week is the latest one played,
/// and which Monday each week belongs to.
/// </summary>
public record DivisionWeekCalendar(int CurrentWeek, IReadOnlyDictionary<int, DateTime> MondayByWeek)
{
    public static DivisionWeekCalendar Build(IEnumerable<(int Week, DateTime Date)> matches, DateTime today)
    {
        // Frenoy leaves the date unset until it schedules the match, and DateTime.MinValue
        // is in the past, so an unset date would otherwise count as played.
        var dated = matches.Where(x => x.Date != DateTime.MinValue).ToList();

        var currentWeek = dated
            .Where(x => x.Date <= today)
            .Select(x => (int?)x.Week)
            .Max() ?? 0;

        // A postponed match keeps playing for its original week, so the week is dated by its earliest match.
        var mondays = dated
            .GroupBy(x => x.Week)
            .ToDictionary(g => g.Key, g => MondayOf(g.Min(x => x.Date)));

        return new DivisionWeekCalendar(currentWeek, mondays);
    }

    private static DateTime MondayOf(DateTime date)
    {
        var daysSinceMonday = ((int)date.DayOfWeek + 6) % 7;
        return date.Date.AddDays(-daysSinceMonday);
    }
}
