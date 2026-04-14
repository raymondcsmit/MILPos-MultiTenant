using MediatR;
using POS.Data.Dto;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Brand.Command
{
    public class GetAllBrandCommand : IRequest<List<BrandDto>>, ICacheableQuery
    {
        public string CacheKey => $"GetAllBrandCommand";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
