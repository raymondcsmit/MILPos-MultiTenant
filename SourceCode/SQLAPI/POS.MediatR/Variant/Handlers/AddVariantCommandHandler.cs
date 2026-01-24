using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class AddVariantCommandHandler : IRequestHandler<AddVariantCommand, ServiceResponse<VariantDto>>
    {

        private readonly IVariantRepository _variantRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddVariantCommandHandler> _logger;
        public AddVariantCommandHandler(
           IVariantRepository variantRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<AddVariantCommandHandler> logger
            )
        {
            _variantRepository = variantRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
        }

        public async Task<ServiceResponse<VariantDto>> Handle(AddVariantCommand request, CancellationToken cancellationToken)
        {
            var existingEntity = await _variantRepository.FindBy(c => c.Name == request.Name).FirstOrDefaultAsync();
            if (existingEntity != null)
            {
                _logger.LogError("Variant Already Exist");
                return ServiceResponse<VariantDto>.Return409("Variant Already Exist.");
            }
            var entity = _mapper.Map<POS.Data.Entities.Variant>(request);
            var variantId = Guid.NewGuid();
            entity.Id = variantId;
            foreach(var variantItem in entity.VariantItems)
            {
                variantItem.VariantId= variantId;
                variantItem.Id= Guid.NewGuid();
            }
            _variantRepository.Add(entity);
            if (await _uow.SaveAsync() <= 0)
            {

                _logger.LogError("Variant have Error");
                return ServiceResponse<VariantDto>.Return500();
            }
            return ServiceResponse<VariantDto>.ReturnResultWith200(_mapper.Map<VariantDto>(entity));
        }
    }
}
