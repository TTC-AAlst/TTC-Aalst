namespace Frenoy.Api;

public static class RankingWeekPlanner
{
    private const int RefetchRecentWeeks = 2;

    /// <summary>
    /// Frenoy rewrites a week's standings when a forfeit or correction lands, so the most recent
    /// weeks are re-fetched rather than trusted — but only when a result in this division actually
    /// moved. The background job runs every 10 minutes across every division, and refetching
    /// unconditionally there would cost thousands of federation calls a day for data that changes
    /// once a week.
    /// </summary>
    public static int[] WeeksToFetch(IReadOnlyCollection<int> stored, int currentWeek, bool refetchRecent)
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

        if (refetchRecent)
        {
            foreach (var week in stored.OrderByDescending(x => x).Take(RefetchRecentWeeks))
            {
                wanted.Add(week);
            }
        }

        return wanted.Order().ToArray();
    }
}
