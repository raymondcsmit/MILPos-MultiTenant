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
    public class UpdateProductCommandHandler
      : IRequestHandler<UpdateProductCommand, ServiceResponse<ProductDto>>
    {

        private readonly IProductRepository _productRepository;
        private readonly IProductTaxRepository _productTaxRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<UpdateProductCommandHandler> _logger;
        private readonly IProductStockRepository _productStockRepository;
        private readonly ILocationRepository _locationRepository;

        public UpdateProductCommandHandler(IProductRepository productRepository,
            IProductTaxRepository productTaxRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment,
            ILogger<UpdateProductCommandHandler> logger,
            IProductStockRepository productStockRepository,
            ILocationRepository locationRepository)
        {
            _productRepository = productRepository;
            _productTaxRepository = productTaxRepository;
            _mapper = mapper;
            _uow = uow;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
            _productStockRepository = productStockRepository;
            _locationRepository = locationRepository;
        }
        public async Task<ServiceResponse<ProductDto>> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            //TODO: check sales & purchase order
            var existingProduct = await _productRepository.All
                .FirstOrDefaultAsync(c => c.Name == request.Name && c.CategoryId == request.CategoryId && c.Id != request.Id);

            if (existingProduct != null)
            {
                _logger.LogError("Proudct is already exists in same category.");
                return ServiceResponse<ProductDto>.Return409("Proudct is already exists in same category.");
            }

            if (!string.IsNullOrWhiteSpace(request.Barcode))
            {
                var existProduct = await _productRepository.All
                               .FirstOrDefaultAsync(c => c.Barcode == request.Barcode && c.Id != request.Id);
                if (existProduct != null)
                {
                    _logger.LogError("Proudct Barcode Number is duplicate.");
                    return ServiceResponse<ProductDto>.Return409("Proudct Barcode Number is duplicate.");
                }
            }

            existingProduct = await _productRepository.All.FirstOrDefaultAsync(c => c.Id == request.Id);

            if (existingProduct == null)
            {
                _logger.LogError("Proudct does not exists.");
                return ServiceResponse<ProductDto>.Return404("Proudct does not exists.");
            }

            var oldProductUrl = existingProduct.ProductUrl;

            if (request.IsProductImageUpload)
            {
                if (!string.IsNullOrWhiteSpace(request.ProductUrlData))
                {
                    existingProduct.ProductUrl = $"{Guid.NewGuid()}.png";
                }
                else
                {
                    existingProduct.ProductUrl = null;
                }
            }


            var productTaxes = _productTaxRepository.All.Where(c => c.ProductId == request.Id).ToList();
            var productTaxToAdd = request.ProductTaxes.Where(c => !productTaxes.Select(c => c.TaxId).Contains(c.TaxId)).ToList();
            _productTaxRepository.AddRange(_mapper.Map<List<ProductTax>>(productTaxToAdd));
            var productTaxToDelete = productTaxes.Where(c => !request.ProductTaxes.Select(cs => cs.TaxId).Contains(c.TaxId)).ToList();
            _productTaxRepository.RemoveRange(productTaxToDelete);
            //request.ProductTaxes = null;



            var existingProductVariants = await _productRepository.All.Where(c => c.ParentId == request.Id).ToListAsync();
            //get product Varaint 
            var productIds = request.ProductVariants.Select(c => c.Id).ToList();
            var productVariantTaxs = await _productTaxRepository.All.Where(c => productIds.Contains(c.ProductId)).ToListAsync();

            var existingProductStock = await _productStockRepository.All.Where(c => productIds.Contains(c.ProductId)).ToListAsync();
            var branchIds = await _locationRepository.All.Select(c => c.Id).ToListAsync();
            if (request.ProductVariants.Count > 0)
            {
                existingProduct.ProductVariants = new List<Data.Product>();

                foreach (var variant in request.ProductVariants)
                {
                    var productVariant = existingProductVariants.Where(c => c.Id == variant.Id).FirstOrDefault();
                    if (variant.Id == null && productVariant == null)
                    {
                        var newproductVariant = new Data.Product();
                        // create new variant
                        newproductVariant = new Data.Product
                        {
                            Id = Guid.NewGuid(),
                            ParentId = existingProduct.Id,
                            BrandId = existingProduct.BrandId,
                            CategoryId = existingProduct.CategoryId,
                            UnitId = existingProduct.UnitId,
                            AlertQuantity = existingProduct.AlertQuantity,
                            ProductUrl = existingProduct.ProductUrl,
                            Name = variant.Name,
                            Mrp = variant.Mrp,
                            PurchasePrice = variant.PurchasePrice,
                            IsMarginIncludeTax = variant.IsMarginIncludeTax,
                            Margin = variant.Margin ?? 0,
                            SalesPrice = variant.SalesPrice,
                            Barcode = variant.Barcode,
                            VariantId = variant.VariantId,
                            VariantItemId = variant.VariantItemId,
                            TaxAmount = variant.TaxAmount
                        };

                        _productRepository.Add(newproductVariant);

                        productVariant = newproductVariant;
                        // create stocks for new variant
                        foreach (var branchId in branchIds)
                        {
                            _productStockRepository.Add(new ProductStock
                            {
                                PurchasePrice = variant.PurchasePrice ?? 0,
                                CurrentStock = 0.0m,
                                LocationId = branchId,
                                ModifiedDate = DateTime.UtcNow,
                                ProductId = productVariant.Id
                            });
                        }
                    }
                    else
                    {
                        productVariant.Name = variant.Name;
                        productVariant.Mrp = variant.Mrp;
                        productVariant.PurchasePrice = variant.PurchasePrice;
                        productVariant.Margin = variant.Margin.Value;
                        productVariant.SalesPrice = variant.SalesPrice;
                        productVariant.Barcode = variant.Barcode;
                        productVariant.TaxAmount = variant.TaxAmount;
                        productVariant.IsMarginIncludeTax = variant.IsMarginIncludeTax;
                        productVariant.ProductUrl = existingProduct.ProductUrl;

                        _productRepository.Update(productVariant);
                        // Update Product Stock 
                        foreach (var brancId in branchIds)
                        {
                            var stock = existingProductStock.FirstOrDefault(c => c.LocationId == brancId && c.ProductId == variant.Id);
                            if (stock != null)
                            {
                                stock.PurchasePrice = variant.PurchasePrice.Value;
                                stock.ModifiedDate = DateTime.UtcNow;
                                _productStockRepository.Update(stock);
                            }

                        }

                    }
                    // 
                    var oldTaxes = productVariantTaxs.Where(c => c.ProductId == productVariant.Id).ToList();
                    var taxesToAdd = request.ProductTaxes.Where(t => !oldTaxes.Select(ot => ot.TaxId).Contains(t.TaxId)).ToList();
                    var taxesToRemove = oldTaxes.Where(ot => !request.ProductTaxes.Select(t => t.TaxId).Contains(ot.TaxId)).ToList();

                    if (taxesToAdd.Any())
                    {
                        var newVariantTaxes = taxesToAdd.Select(t => new ProductTax
                        {
                            ProductId = productVariant.Id,
                            TaxId = t.TaxId
                        }).ToList();
                        _productTaxRepository.AddRange(newVariantTaxes);
                    }

                    if (taxesToRemove.Any())
                    {
                        _productTaxRepository.RemoveRange(taxesToRemove);
                    }
                }
            }
            else
            {
                var productStocks = await _productStockRepository.All.Where(c => c.ProductId == request.Id).ToListAsync();
                foreach (var brancId in branchIds)
                {
                    var branchProductStock = productStocks.FirstOrDefault(c => c.LocationId == brancId);
                    if (branchProductStock != null)
                    {
                        branchProductStock.PurchasePrice = request.PurchasePrice.Value;
                        branchProductStock.ModifiedDate = DateTime.UtcNow;
                        _productStockRepository.Update(branchProductStock);
                    }

                }
            }
            request.ProductVariants = null;
            request.ProductTaxes = null;
            _mapper.Map(request, existingProduct);
            _productRepository.Update(existingProduct);

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error While saving Proudct.");
                return ServiceResponse<ProductDto>.Return500();
            }

            try
            {
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

                if (request.IsProductImageUpload)
                {
                    if (!string.IsNullOrWhiteSpace(request.ProductUrlData))
                    {
                        await FileData.SaveFile(Path.Combine(pathToSave, existingProduct.ProductUrl), request.ProductUrlData);
                        await FileData.SaveThumbnailFile(Path.Combine(thumbnailPathToSave, existingProduct.ProductUrl), request.ProductUrlData);
                    }

                    if (!string.IsNullOrWhiteSpace(oldProductUrl))
                    {
                        FileData.DeleteFile(Path.Combine(pathToSave, oldProductUrl));
                        FileData.DeleteFile(Path.Combine(thumbnailPathToSave, oldProductUrl));
                    }
                }

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error While saving Proudct Image.");
            }

            var entityDto = _mapper.Map<ProductDto>(existingProduct);
            return ServiceResponse<ProductDto>.ReturnResultWith201(entityDto);
        }
    }
}
