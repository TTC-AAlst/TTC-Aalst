using System.Net;
using System.Net.Http.Json;

namespace Ttc.UnitTests.Integration;

public class LogControllerTests : IntegrationTestBase
{
    public LogControllerTests(TtcWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Post_AcceptsBatch_Returns200()
    {
        var batch = new
        {
            sessionId = "abc-123",
            appVersion = "deadbeef",
            env = "pr-5",
            isMobile = true,
            entries = new[]
            {
                new { level = "info", message = "route", route = "/teams", ts = "2026-06-21T08:00:00Z", fields = (object?)null },
                new { level = "error", message = "boom", route = "/teams", ts = "2026-06-21T08:00:01Z", fields = (object?)null },
            },
        };

        var response = await Client.PostAsJsonAsync("/api/log", batch);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Post_EmptyBatch_Returns200()
    {
        var response = await Client.PostAsJsonAsync("/api/log", new { sessionId = "x", entries = new object[0] });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Post_UnknownLevel_Returns200()
    {
        var batch = new
        {
            sessionId = "x",
            entries = new[] { new { level = "debug", message = "hi", route = "/x", ts = "2026-06-21T08:00:00Z", fields = (object?)null } },
        };
        var response = await Client.PostAsJsonAsync("/api/log", batch);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Request_WithSessionHeader_StillSucceeds()
    {
        Client.DefaultRequestHeaders.Remove("X-Session-Id");
        Client.DefaultRequestHeaders.Add("X-Session-Id", "sess-789");

        var response = await Client.GetAsync("/api/config");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
