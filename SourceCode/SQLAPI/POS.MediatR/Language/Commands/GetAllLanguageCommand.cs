using MediatR;
using POS.Data.Dto;
using POS.MediatR.PipeLineBehavior;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Language.Commands
{
    public class GetAllLanguageCommand : IRequest<List<LanguageDto>>, ICacheableQuery
    {
        public string CacheKey => "GetAllLanguageCommand";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromHours(24);
        public bool BypassCache => false;
    }
}
