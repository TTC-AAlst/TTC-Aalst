using System.Diagnostics;
using System.Text.Json;
using Ttc.Model.Core;

namespace Ttc.WebApi.Utilities.Pipeline;

public class RequestLoggingFilter
{
    private readonly RequestDelegate _next;
    private readonly TtcLogger _logger;

    public RequestLoggingFilter(RequestDelegate next, TtcLogger logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        var sessionId = context.Request.Headers["X-Session-Id"].ToString();
        using var _ = string.IsNullOrEmpty(sessionId)
            ? (IDisposable)NullScope.Instance
            : Serilog.Context.LogContext.PushProperty("SessionId", sessionId);

        if (!context.Request.Path.ToString().StartsWith("/api") || context.Request.Method == HttpMethods.Options
            || context.Request.Path.ToString() == "/api/log")
        {
            await _next(context);
            return;
        }

        var timer = Stopwatch.StartNew();
        context.Request.EnableBuffering();
        var request = context.Request;

        string body = "";
        if (request.Method != HttpMethods.Get && request.Method != HttpMethods.Delete && request.ContentLength > 0
            && request.Path != "/api/User/sign-in" && request.Path != "/api/users/ValidateToken"
            && request.Path != "/api/User/ChangePassword" && request.Path != "/api/User/SetNewPasswordFromGuid"
            && request.Path != "/api/User/AdminSetNewPassword")
        {
            request.Body.Position = 0;
            using var reader = new StreamReader(request.Body, leaveOpen: true);
            body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
        }

        var qs = request.Query.ToDictionary(q => q.Key, q => q.Value.ToString());
        var queryParams = JsonSerializer.Serialize(qs);

        if (qs.Count > 0 && body.Length > 0)
        {
            _logger.Information("{Method} {Path} - Query: {Query}, Body: {Body}", request.Method, request.Path, queryParams, body);
        }
        else if (qs.Count > 0)
        {
            _logger.Information("{Method} {Path} - Query: {Query}", request.Method, request.Path, queryParams);
        }
        else if (body.Length > 0)
        {
            _logger.Information("{Method} {Path} - Body: {Body}", request.Method, request.Path, body);
        }
        else
        {
            _logger.Information("{Method} {Path}", request.Method, request.Path);
        }


        await _next(context);


        _logger.Information("{Method} {Path} - in {Elapsed}", request.Method, request.Path, timer.Elapsed.ToString("g"));
    }
}

internal sealed class NullScope : IDisposable
{
    public static readonly NullScope Instance = new();
    private NullScope() { }
    public void Dispose() { }
}
