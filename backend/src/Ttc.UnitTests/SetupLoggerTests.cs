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
}
