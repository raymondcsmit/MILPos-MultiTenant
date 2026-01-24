using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Product.Command;
using POS.Repository;

namespace POS.MediatR.Product.Handler
{
    public class AddProductCommandHanlder
        : IRequestHandler<AddProductCommand, ServiceResponse<ProductDto>>
    {

        private readonly IProductRepository _productRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<UpdateProductCommandHandler> _logger;
        private readonly IProductStockRepository _productStockRepository;
        private readonly ILocationRepository _locationRepository;
        private readonly IProductTaxRepository _productTaxRepository;

        public AddProductCommandHanlder(IProductRepository productRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment,
            ILogger<UpdateProductCommandHandler> logger,
            IProductStockRepository productStockRepository,
            ILocationRepository locationRepository,
            IProductTaxRepository productTaxRepository)
        {
            _productRepository = productRepository;
            _mapper = mapper;
            _uow = uow;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
            _productStockRepository = productStockRepository;
            _locationRepository = locationRepository;
            _productTaxRepository = productTaxRepository;
        }
        public async Task<ServiceResponse<ProductDto>> Handle(AddProductCommand request, CancellationToken cancellationToken)
        {
            var existingProduct = await _productRepository.All
                .FirstOrDefaultAsync(c => c.Name == request.Name && c.CategoryId == request.CategoryId && c.Barcode == request.Barcode);
            if (existingProduct != null)
            {
                _logger.LogError("Proudct is already exists in same category.");
                return ServiceResponse<ProductDto>.Return409("Proudct is already exists in same category.");
            }

            if (!string.IsNullOrWhiteSpace(request.Barcode))
            {
                var existProduct = await _productRepository.All
                               .FirstOrDefaultAsync(c => c.Barcode == request.Barcode);
                if (existProduct != null)
                {
                    _logger.LogError("Proudct Barcode Number is duplicate.");
                    return ServiceResponse<ProductDto>.Return409("Proudct Barcode Number is duplicate.");
                }
            }

            var product = _mapper.Map<Data.Product>(request);
            product.Id = Guid.NewGuid();
            if (!string.IsNullOrWhiteSpace(request.ProductUrlData))
            {
                product.ProductUrl = $"{Guid.NewGuid()}.png";
            }
            var branchIds = await _locationRepository.All.Select(c => c.Id).ToListAsync();
            if (request.ProductVariants.Count > 0)
            {
                product.ProductVariants = new List<Data.Product>();
                foreach (var variant in request.ProductVariants)
                {
                    var productVariant = _mapper.Map<Data.Product>(variant);
                    productVariant.Id = Guid.NewGuid();
                    productVariant.ParentId = product.Id;
                    productVariant.BrandId = product.BrandId;
                    productVariant.CategoryId = product.CategoryId;
                    productVariant.UnitId = product.UnitId;
                    productVariant.AlertQuantity = product.AlertQuantity;
                    productVariant.ProductUrl = product.ProductUrl;
                    product.ProductVariants.Add(productVariant);

                    foreach (var brancId in branchIds)
                    {
                        var ProductStock = new ProductStock
                        {
                            PurchasePrice = variant.PurchasePrice.Value,
                            CurrentStock = 0.0m,
                            LocationId = brancId,
                            ModifiedDate = DateTime.UtcNow,
                            ProductId = productVariant.Id,
                        };
                        _productStockRepository.Add(ProductStock);
                    }
                    if (request.ProductTaxes != null)
                    {
                        productVariant.ProductTaxes = new List<ProductTax>();
                        foreach (var item in request.ProductTaxes.DistinctBy(t => t.TaxId))
                        {
                            productVariant.ProductTaxes.Add(new ProductTax
                            {
                                ProductId = productVariant.Id,
                                TaxId = item.TaxId
                            });
                        }
                    }


                }

            }
            else
            {
                foreach (var branchId in branchIds)
                {
                    var ProductStock = new ProductStock
                    {
                        PurchasePrice = request.PurchasePrice.Value,
                        CurrentStock = 0.0m,
                        LocationId = branchId,
                        ModifiedDate = DateTime.UtcNow,
                        ProductId = product.Id,
                    };
                    _productStockRepository.Add(ProductStock);
                }

            }

            _productRepository.Add(product);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error While saving product.");
                return ServiceResponse<ProductDto>.Return500();
            }

            string contentRootPath = _webHostEnvironment.WebRootPath;
            var pathToSave = Path.Combine(contentRootPath, _pathHelper.ProductImagePath);
            var thumbnailPathToSave = Path.Combine(contentRootPath, _pathHelper.ProductThumbnailImagePath);
            if (!Directory.Exists(pathToSave))
            {
                Directory.CreateDirectory(pathToSave);
            }

            if (!Directory.Exists(thumbnailPathToSave))
            {
                Directory.CreateDirectory(thumbnailPathToSave);
            }

            if (!string.IsNullOrWhiteSpace(request.ProductUrlData))
            {
                await FileData.SaveFile(Path.Combine(pathToSave, product.ProductUrl), request.ProductUrlData);
                await FileData.SaveThumbnailFile(Path.Combine(thumbnailPathToSave, product.ProductUrl), request.ProductUrlData);
            }

            return ServiceResponse<ProductDto>.ReturnResultWith201(_mapper.Map<ProductDto>(product));
        }
    }

}