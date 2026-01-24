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
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    internal class UpdateVariantCommandHandler : IRequestHandler<UpdateVariantCommand, ServiceResponse<VariantDto>>
    {
        private readonly IVariantRepository _variantRepository;

        private readonly IVariantItemRepository _variantItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddVariantCommandHandler> _logger;
        public UpdateVariantCommandHandler(
           IVariantRepository variantRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<AddVariantCommandHandler> logger,
            IVariantItemRepository variantItemRepository
            )
        {
            _variantRepository = variantRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
            _variantItemRepository = variantItemRepository;
        }

        public async Task<ServiceResponse<VariantDto>> Handle(UpdateVariantCommand request, CancellationToken cancellationToken)
        {
            var existingEntity = await _variantRepository.FindBy(c => c.Name == request.Name && c.Id != request.Id).FirstOrDefaultAsync();
            if (existingEntity != null)
            {
                _logger.LogError("Variant Already Exist for another item");
                return ServiceResponse<VariantDto>.Return409("Variant Already Exist for another item.");
            }

            existingEntity = await _variantRepository.All.FirstOrDefaultAsync(c => c.Id == request.Id);
            if (existingEntity == null)
            {
                _logger.LogError("Variant Not Found");
                return ServiceResponse<VariantDto>.Return404();
            }

            var variantItems = _variantItemRepository.FindBy(c => c.VariantId == request.Id).ToList();
            var varianstoDelete = variantItems.Where(c => !request.VariantItems.Any(x => x.Id == c.Id)).ToList();
            var variantstoAdd = request.VariantItems.Where(c => !variantItems.Any(x => x.Id == c.Id)).ToList();
            var variantstoUpdate = request.VariantItems.Where(c => variantItems.Any(x => x.Id == c.Id)).ToList();

            _variantItemRepository.RemoveRange(varianstoDelete);

            var variantItemsToAdd = _mapper.Map<List<VariantItem>>(variantstoAdd);
            variantItemsToAdd.ForEach(item => item.VariantId = request.Id);
            _variantItemRepository.AddRange(variantItemsToAdd);

            foreach (var variantItem in variantstoUpdate)
            {
                var item = variantItems.FirstOrDefault(c => c.Id == variantItem.Id);
                item.Name = variantItem.Name;
                _variantItemRepository.Update(item);
            }

            existingEntity.Name = request.Name;
            _variantRepository.Update(existingEntity);
            if (await _uow.SaveAsync() <= 0)
            {

                _logger.LogError("Variant have Error");
                return ServiceResponse<VariantDto>.Return500();
            }
            return ServiceResponse<VariantDto>.ReturnResultWith200(_mapper.Map<VariantDto>(existingEntity));
        }
    }
}
