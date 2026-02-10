using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.PipeLineBehavior
{
    public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;

        public CachingBehavior(IMemoryCache cache, ILogger<CachingBehavior<TRequest, TResponse>> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
        {
            if (request is ICacheableQuery cacheableQuery)
            {
                if (cacheableQuery.BypassCache)
                {
                    return await next();
                }

                var cacheKey = cacheableQuery.CacheKey;

                if (_cache.TryGetValue(cacheKey, out TResponse cachedResponse))
                {
                    _logger.LogInformation($"Fetching from cache for key: {cacheKey}");
                    return cachedResponse;
                }

                var response = await next();

                var expiration = cacheableQuery.AbsoluteExpiration ?? TimeSpan.FromHours(24);

                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = expiration
                };

                _cache.Set(cacheKey, response, cacheOptions);
                _logger.LogInformation($"Added to cache with key: {cacheKey}");

                return response;
            }

            return await next();
        }
    }
}
