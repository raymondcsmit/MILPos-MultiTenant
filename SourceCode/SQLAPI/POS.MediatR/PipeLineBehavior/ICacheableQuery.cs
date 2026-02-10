using System;

namespace POS.MediatR.PipeLineBehavior
{
    public interface ICacheableQuery
    {
        string CacheKey { get; }
        TimeSpan? AbsoluteExpiration { get; }
        bool BypassCache { get; }
    }
}
