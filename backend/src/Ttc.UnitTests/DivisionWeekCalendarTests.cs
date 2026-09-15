using Frenoy.Api;

namespace Ttc.UnitTests;

public class DivisionWeekCalendarTests
{
    private static readonly DateTime Today = new(2026, 10, 7);

    [Fact]
    public void CurrentWeek_IsTheLatestWeekAlreadyPlayed()
    {
        var calendar = DivisionWeekCalendar.Build(
        [
            (1, new DateTime(2026, 9, 18)),
            (2, new DateTime(2026, 9, 25)),
            (3, new DateTime(2026, 10, 30)),
        ], Today);

        Assert.Equal(2, calendar.CurrentWeek);
    }

    [Fact]
    public void UndatedMatchesAreNotPlayed()
    {
        // Frenoy leaves the date unset on matches it has not scheduled yet, and
        // DateTime.MinValue is before today, so every future week would count as played.
        var calendar = DivisionWeekCalendar.Build(
        [
            (1, new DateTime(2026, 9, 18)),
            (11, DateTime.MinValue),
        ], Today);

        Assert.Equal(1, calendar.CurrentWeek);
    }

    [Fact]
    public void NoMatchesPlayedYet_IsWeekZero()
    {
        var calendar = DivisionWeekCalendar.Build([(1, new DateTime(2026, 10, 30))], Today);

        Assert.Equal(0, calendar.CurrentWeek);
    }

    [Fact]
    public void NoMatchesAtAll_IsWeekZero()
    {
        var calendar = DivisionWeekCalendar.Build([], Today);

        Assert.Equal(0, calendar.CurrentWeek);
        Assert.Empty(calendar.MondayByWeek);
    }

    [Theory]
    [InlineData(2026, 9, 18)] // friday
    [InlineData(2026, 9, 20)] // sunday
    [InlineData(2026, 9, 14)] // the monday itself
    public void AWeekIsDatedByItsMonday(int year, int month, int day)
    {
        var calendar = DivisionWeekCalendar.Build([(1, new DateTime(year, month, day))], Today);

        Assert.Equal(new DateTime(2026, 9, 14), calendar.MondayByWeek[1]);
    }

    [Fact]
    public void APostponedMatchDoesNotMoveItsWeek()
    {
        var calendar = DivisionWeekCalendar.Build(
        [
            (1, new DateTime(2026, 9, 18)),
            (1, new DateTime(2026, 11, 6)),
        ], Today);

        Assert.Equal(new DateTime(2026, 9, 14), calendar.MondayByWeek[1]);
    }

    [Fact]
    public void UnplayedWeeksAreStillDated()
    {
        var calendar = DivisionWeekCalendar.Build(
        [
            (1, new DateTime(2026, 9, 18)),
            (3, new DateTime(2026, 10, 30)),
        ], Today);

        Assert.Equal(new DateTime(2026, 10, 26), calendar.MondayByWeek[3]);
    }

    [Fact]
    public void AnUndatedWeekHasNoMonday()
    {
        var calendar = DivisionWeekCalendar.Build([(4, DateTime.MinValue)], Today);

        Assert.False(calendar.MondayByWeek.ContainsKey(4));
    }
}
