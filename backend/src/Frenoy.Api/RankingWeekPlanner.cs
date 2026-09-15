namespace Frenoy.Api;

public static class RankingWeekPlanner
{
    private const int RefetchRecentWeeks = 2;

    /// <summary>
    /// Frenoy rewrites a week's standings when a forfeit or correction lands, so the
    /// most recent stored weeks are always re-fetched rather than trusted.
    /// </summary>
    public static int[] WeeksToFetch(IReadOnlyCollection<int> stored, int currentWeek)
    {
        if (currentWeek < 1)
        {
            return [];
        }

        var wanted = new HashSet<int>();
        for (var week = 1; week <= currentWeek; week++)
        {
            if (!stored.Contains(week))
            {
                wanted.Add(week);
            }
        }

        foreach (var week in stored.OrderByDescending(x => x).Take(RefetchRecentWeeks))
        {
            wanted.Add(week);
        }

        return wanted.Order().ToArray();
    }
}
