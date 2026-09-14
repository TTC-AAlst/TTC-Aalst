using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ttc.DataAccess.Services;
using Ttc.DataEntities.Core;

namespace Ttc.DataAccess;

/// <summary>
/// TTC Aalst DataAccess configuration
/// </summary>
public static class GlobalBackendConfiguration
{
    public static void Configure(IServiceCollection services, IConfigurationRoot configuration)
    {
        ConfigureDbContext(services, configuration);
        ConfigureServices(services);
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        services.AddScoped<ClubService>();
        services.AddScoped<ConfigService>();
        services.AddScoped<MatchService>();
        services.AddScoped<TeamService>();
        services.AddScoped<PlayerService>();
        services.AddScoped<ToogService>();
    }

    private static void ConfigureDbContext(IServiceCollection services, IConfigurationRoot configuration)
    {
        var connectionString = configuration.GetConnectionString("Ttc");
        services.AddDbContext<ITtcDbContext, TtcDbContext>(
            dbContextOptions => ConfigureDbContextBuilder(dbContextOptions, connectionString));
    }

    internal static void ConfigureDbContextBuilder(DbContextOptionsBuilder builder, string? connectionString = null)
    {
        if (connectionString == null)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Ttc.WebApi"))
                .AddJsonFile("appsettings.json")
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"}.json", optional: true)
                .Build();
            connectionString = configuration.GetConnectionString("Ttc") ?? "";
        }

        string? mysqlPassword = Environment.GetEnvironmentVariable("MYSQL_ROOT_PASSWORD");
        if (!string.IsNullOrWhiteSpace(mysqlPassword))
        {
            connectionString = connectionString.Replace("{MYSQL_ROOT_PASSWORD}", mysqlPassword);
        }

        builder.UseMySQL(connectionString!)
            // The following three options help with debugging, but should
            // be changed or removed for production.
            .LogTo(Console.WriteLine, LogLevel.Warning);
        //.EnableSensitiveDataLogging()
        //.EnableDetailedErrors()
    }
}
