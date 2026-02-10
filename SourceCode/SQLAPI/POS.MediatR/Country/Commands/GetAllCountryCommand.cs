using MediatR;
using POS.Data.Dto;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Country.Command
{
    public class GetAllCountryCommand : IRequest<List<CountryDto>>, ICacheableQuery
    {
        public string CacheKey => "GetAllCountryCommand";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(24);
        public bool BypassCache => false;
    }
}
