using Frenoy.Api;

namespace Ttc.UnitTests;

public class RankingWeekPlannerTests
{
    [Fact]
    public void NothingStored_FetchesEveryPlayedWeek()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [], currentWeek: 5, refetchRecent: true);
        Assert.Equal([1, 2, 3, 4, 5], weeks);
    }

    [Fact]
    public void SeasonNotStarted_FetchesNothing()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [], currentWeek: 0, refetchRecent: true);
        Assert.Empty(weeks);
    }

    [Fact]
    public void FetchesTheMissingWeeks()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3], currentWeek: 5, refetchRecent: true);
        Assert.Contains(4, weeks);
        Assert.Contains(5, weeks);
    }

    [Fact]
    public void RefetchesTheTwoMostRecentStoredWeeks()
    {
        // A forfeit or correction can change a week that was already stored.
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3], currentWeek: 5, refetchRecent: true);
        Assert.Contains(2, weeks);
        Assert.Contains(3, weeks);
        Assert.DoesNotContain(1, weeks);
    }

    [Fact]
    public void FullyUpToDate_StillRefetchesRecentWeeks()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3, 4, 5], currentWeek: 5, refetchRecent: true);
        Assert.Equal([4, 5], weeks);
    }

    [Fact]
    public void ReturnsWeeksInOrderWithoutDuplicates()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3], currentWeek: 6, refetchRecent: true);
        Assert.Equal([2, 3, 4, 5, 6], weeks);
    }

    [Fact]
    public void WithoutRefetch_AnUpToDateDivisionCostsNothing()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3, 4, 5], currentWeek: 5, refetchRecent: false);
        Assert.Empty(weeks);
    }

    [Fact]
    public void WithoutRefetch_MissingWeeksAreStillBackfilled()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2], currentWeek: 5, refetchRecent: false);
        Assert.Equal([3, 4, 5], weeks);
    }

    [Fact]
    public void GapInStoredWeeks_IsFilled()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 4], currentWeek: 4, refetchRecent: true);
        Assert.Contains(2, weeks);
        Assert.Contains(3, weeks);
    }
}
