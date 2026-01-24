using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Variant
{
    public class GetAllVariantCommandHandler : IRequestHandler<GetAllVariantCommand, ServiceResponse<List<VariantDto>>>
    {
        private readonly IVariantRepository _variantRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<GetAllVariantCommandHandler> _logger;
        public GetAllVariantCommandHandler(
           IVariantRepository variantRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<GetAllVariantCommandHandler> logger
            )
        {
            _variantRepository = variantRepository;
            _mapper = mapper;
            _logger = logger;
        }
        public async Task<ServiceResponse<List<VariantDto>>> Handle(GetAllVariantCommand request, CancellationToken cancellationToken)
        {
            var variants = await _variantRepository.All.Include(c => c.VariantItems).ToListAsync();
            return ServiceResponse<List<VariantDto>>.ReturnResultWith200(_mapper.Map<List<VariantDto>>(variants));
        }
    }
}
