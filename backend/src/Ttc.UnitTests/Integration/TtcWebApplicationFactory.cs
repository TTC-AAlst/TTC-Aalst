using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Testcontainers.MySql;
using Ttc.DataAccess;
using Ttc.DataEntities.Core;

namespace Ttc.UnitTests.Integration;

public class TtcWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MySqlContainer _mySqlContainer = new MySqlBuilder("mysql:8.4")
        .WithDatabase("ttc_aalst_test")
        .WithUsername("root")
        .WithPassword("testpassword")
        .Build();

    private readonly string _webApiDir;

    public TtcWebApplicationFactory()
    {
        var solutionDir = FindSolutionDirectory();
        _webApiDir = Path.Combine(solutionDir, "src", "Ttc.WebApi");
    }

    public const string TournooikeSecret = "tournooike-test-secret";

    public string ConnectionString => _mySqlContainer.GetConnectionString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Add test-specific configuration
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["TtcSettings:JwtSecret"] = "TestSecretKeyThatIsLongEnoughForHS256Algorithm123456",
                ["TtcSettings:Issuer"] = "ttc-test",
                ["TtcSettings:Origins"] = "http://localhost",
                ["TtcSettings:StartSyncJob"] = "false",
                ["TtcSettings:PongRankUrl"] = "http://localhost:9999",
                ["TtcSettings:Loki"] = "",
                ["TtcSettings:Email:Host"] = "localhost",
                ["TtcSettings:Email:Port"] = "25",
                ["TtcSettings:Email:UserName"] = "test",
                ["TtcSettings:Email:Password"] = "test",
                ["TtcSettings:Email:EmailFrom"] = "test@test.com",
                ["TtcSettings:PublicImageFolder"] = Path.GetTempPath(),
                ["ConnectionStrings:Ttc"] = ConnectionString
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Remove existing DbContext registration
            services.RemoveAll<DbContextOptions<TtcDbContext>>();
            services.RemoveAll<ITtcDbContext>();
            services.RemoveAll<TtcDbContext>();

            // Add DbContext with test container connection string
            services.AddDbContext<TtcDbContext>(options =>
            {
                options.UseMySQL(
                    ConnectionString,
                    mysqlOptions => mysqlOptions.EnableRetryOnFailure());
            });
            services.AddScoped<ITtcDbContext>(sp => sp.GetRequiredService<TtcDbContext>());

            // Disable hosted services during tests
            services.RemoveAll<IHostedService>();
        });

        builder.UseEnvironment("Testing");
    }

    public async Task InitializeAsync()
    {
        // Set environment variables BEFORE the app starts (LoadSettings reads these)
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("MYSQL_ROOT_PASSWORD", "testpassword");
        Environment.SetEnvironmentVariable("TtcSettings__TournooikeSecret", TournooikeSecret);
        // Disable Ryuk (resource reaper) to avoid connection issues on Windows
        Environment.SetEnvironmentVariable("TESTCONTAINERS_RYUK_DISABLED", "true");

        // Set working directory to WebApi project so LoadSettings finds appsettings files
        Directory.SetCurrentDirectory(_webApiDir);

        // Create test uploads folder required by static file middleware
        var testUploadsPath = Path.Combine(_webApiDir, "test-uploads");
        Directory.CreateDirectory(testUploadsPath);

        await _mySqlContainer.StartAsync();
    }

    private static string FindSolutionDirectory()
    {
        var dir = AppContext.BaseDirectory;
        while (dir != null && !File.Exists(Path.Combine(dir, "Ttc.slnx")))
        {
            dir = Directory.GetParent(dir)?.FullName;
        }
        return dir ?? throw new InvalidOperationException("Could not find solution directory");
    }

    public new async Task DisposeAsync()
    {
        await _mySqlContainer.StopAsync();
        await base.DisposeAsync();
    }
}
