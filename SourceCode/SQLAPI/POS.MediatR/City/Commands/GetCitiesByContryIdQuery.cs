using POS.Data.Dto;
using MediatR;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;

namespace POS.MediatR.CommandAndQuery
{
    public class GetCitiesByContryIdQuery : IRequest<List<CityDto>>, ICacheableQuery
    {
        public Guid CountryId { get; set; }
        public string CityName { get; set; }

        public string CacheKey => $"GetCitiesByContryIdQuery_{CountryId}_{CityName}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(24);
        public bool BypassCache => false;
    }
}
