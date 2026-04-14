using POS.Data.Dto;
using POS.MediatR.PipeLineBehavior;
using MediatR;
using System;
using System.Collections.Generic;

namespace POS.MediatR.CommandAndQuery
{
    public class GetAllProductCategoriesQuery : IRequest<List<ProductCategoryDto>>, ICacheableQuery
    {
        public bool IsDropDown { get; set; } = false;
        public Guid? Id { get; set; }

        public string CacheKey => $"GetAllProductCategoriesQuery_{IsDropDown}_{Id}";
        public TimeSpan? AbsoluteExpiration => TimeSpan.FromMinutes(15);
        public bool BypassCache => false;
    }
}
