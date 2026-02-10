using MediatR;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Currency.Commands
{
    public class GetAllCurrencyCommand : IRequest<List<CurrencyDto>>, ICacheableQuery
    {
        public string CacheKey => "GetAllCurrencyCommand";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(24);
        public bool BypassCache => false;
    }
}
