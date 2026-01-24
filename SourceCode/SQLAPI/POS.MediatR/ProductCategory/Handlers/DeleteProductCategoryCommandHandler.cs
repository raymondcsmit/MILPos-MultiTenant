using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Category.Commands;
using POS.Repository;

namespace POS.MediatR.Category.Handlers
{
    public class DeleteProductCategoryCommandHandler
        : IRequestHandler<DeleteProductCategoryCommand, ServiceResponse<bool>>
    {
        private readonly IProductCategoryRepository _productCategoryRepository;
        private readonly IProductRepository _productRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<DeleteProductCategoryCommandHandler> _logger;
        public DeleteProductCategoryCommandHandler(
           IProductCategoryRepository productCategoryRepository,
           IProductRepository productRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeleteProductCategoryCommandHandler> logger
            )
        {
            _productCategoryRepository = productCategoryRepository;
            _productRepository = productRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
        }
        public async Task<ServiceResponse<bool>> Handle(DeleteProductCategoryCommand request, CancellationToken cancellationToken)
        {
            var existingCategories = await _productCategoryRepository.All
                 .Where(c => c.Id == request.Id || c.ParentId == request.Id)
                 .ToListAsync();

            if (existingCategories.Count == 0)
            {
                _logger.LogError("Product Category does not exist");
                return ServiceResponse<bool>.Return404("Product Category does not exist.");
            }
            var categoryIds = existingCategories.Select(c => c.Id).ToList();

            var hasProducts = await _productRepository.All
                .AnyAsync(p => categoryIds.Contains(p.CategoryId));
            if (hasProducts)
            {
                _logger.LogError("Product Category cannot be deleted because it is used in a product");
                return ServiceResponse<bool>.Return409("Product Category cannot be deleted because it is used in a product.");
            }
            foreach (var category in existingCategories)
            {
                _productCategoryRepository.Delete(category);
            }


            if (await _uow.SaveAsync() <= 0)
            {

                _logger.LogError("Error While saving Product Category.");
                return ServiceResponse<bool>.Return500();
            }
            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
