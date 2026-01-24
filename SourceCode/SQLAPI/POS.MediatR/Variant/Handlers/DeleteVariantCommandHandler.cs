using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.Repository;

namespace POS.MediatR
{
    public class DeleteVariantCommandHandler : IRequestHandler<DeleteVariantCommand, ServiceResponse<bool>>
    {

        private readonly IVariantRepository _variantRepository;
        private readonly IProductRepository _productRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<DeleteVariantCommandHandler> _logger;
        private readonly UserInfoToken _userInfoToken;
        public DeleteVariantCommandHandler(
           IVariantRepository variantRepository,
           IProductRepository productRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeleteVariantCommandHandler> logger,
             UserInfoToken userInfoToken
            )
        {
            _variantRepository = variantRepository;
            _productRepository = productRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
            _userInfoToken = userInfoToken;
        }

        public async Task<ServiceResponse<bool>> Handle(DeleteVariantCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _variantRepository.FindAsync(request.Id);
            if (entityExist == null)
            {
                _logger.LogError("Variant does not exist");
                return ServiceResponse<bool>.Return409("Variant does not exist");
            }
            var exitingProduct = _productRepository.All.Where(c => c.VariantId == entityExist.Id).Any();
            if (exitingProduct)
            {
                _logger.LogError("Variant can not be Deleted because it is use in Product");
                return ServiceResponse<bool>.Return409("Variant can not be Deleted because it is use in Product");
            }
            entityExist.DeletedDate = DateTime.UtcNow;
            entityExist.DeletedBy = _userInfoToken.Id;
            entityExist.IsDeleted = true;
            _variantRepository.Update(entityExist);

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error While deleting variant.");
                return ServiceResponse<bool>.Return500();
            }

            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
