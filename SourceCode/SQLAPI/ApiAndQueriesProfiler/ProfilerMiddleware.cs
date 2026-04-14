using Microsoft.AspNetCore.Http;
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace ApiAndQueriesProfiler
{
    public class ProfilerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ProfilerLogChannel _channel;

        public ProfilerMiddleware(RequestDelegate next, ProfilerLogChannel channel)
        {
            _next = next;
            _channel = channel;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value ?? string.Empty;
            var isWebSocket = context.WebSockets.IsWebSocketRequest || context.Request.Headers["Upgrade"] == "websocket";
            
            // Ignore SignalR endpoints and WebSockets to avoid massive "latency" spikes from long-running connections
            if (path.StartsWith("/userHub", StringComparison.OrdinalIgnoreCase) || isWebSocket)
            {
                await _next(context);
                return;
            }

            var correlationId = Guid.NewGuid().ToString("N");
            ProfilerContext.CurrentCorrelationId = correlationId;

            var stopwatch = Stopwatch.StartNew();

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();

                var log = new ApiRequestLog
                {
                    CorrelationId = correlationId,
                    Method = context.Request.Method,
                    Path = context.Request.Path,
                    QueryString = context.Request.QueryString.ToString(),
                    StatusCode = context.Response.StatusCode,
                    DurationMs = stopwatch.ElapsedMilliseconds,
                    IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = context.Request.Headers["User-Agent"].ToString()
                };

                _channel.TryWrite(log);
            }
        }
    }
}
