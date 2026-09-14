using Ttc.WebApi.Utilities.Pipeline;

namespace Ttc.UnitTests;

public class SetupLoggerTests
{
    [Theory]
    [InlineData("https://ttc-aalst.be", "ttc")]
    [InlineData("https://dev-ttc-aalst.sangu.be", "ttc-dev")]
    [InlineData("https://pr-7-ttc-aalst.sangu.be", "ttc-pr-7")]
    [InlineData("https://ttc-aalst.be,https://www.ttc-aalst.be", "ttc")]
    [InlineData("http://localhost", "ttc")]
    [InlineData(null, "ttc")]
    [InlineData("", "ttc")]
    public void AppLabelForOrigin_MapsOriginToLokiLabel(string? origins, string expected)
    {
        Assert.Equal(expected, SetupLogger.AppLabelForOrigin(origins));
    }

    [Fact]
    public void PropertiesAsLabels_ContainsOnlyBoundedProperties()
    {
        // A Loki label value starts a new stream, and a stream is the unit Loki indexes,
        // chunks and flushes. Anything per-request or per-user in here costs orders of
        // magnitude more than the logs it carries.
        string[] bounded = ["level", "app", "env"];

        Assert.Equal(bounded, SetupLogger.PropertiesAsLabels);
    }
}
