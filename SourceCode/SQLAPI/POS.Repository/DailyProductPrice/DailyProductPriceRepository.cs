using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class DailyProductPriceRepository : IDailyProductPriceRepository
    {
        private readonly POSDbContext _context;
        private readonly ITenantProvider _tenantProvider;
        private readonly UserInfoToken _userInfoToken;

        public DailyProductPriceRepository(POSDbContext context, ITenantProvider tenantProvider, UserInfoToken userInfoToken)
        {
            _context = context;
            _tenantProvider = tenantProvider;
            _userInfoToken = userInfoToken;
        }

        public async Task<DailyPriceListDto> GetDailyPriceList(DateTime priceDate)
        {
            var tenantId = _tenantProvider.GetTenantId();
            var date = priceDate.Date;
            var previousDate = date.AddDays(-1);

            // Fetch all active products
            var products = await _context.Products
                .Include(p => p.ProductCategory)
                .Include(p => p.Brand)
                .Include(p => p.Unit)
                .Where(p => !p.IsDeleted)
                .ToListAsync();

            // Fetch daily prices for the requested date
            var dailyPrices = await _context.DailyProductPrices
                .Where(dp => dp.PriceDate == date && dp.TenantId == tenantId && !dp.IsDeleted)
                .ToListAsync();

            // Fetch prices for the previous day (or latest available before today? Plan said Previous Day)
            // For now, let's strictly check previous day to keep it simple as per spec "Yesterday"
            var previousPrices = await _context.DailyProductPrices
                .Where(dp => dp.PriceDate == previousDate && dp.TenantId == tenantId && !dp.IsDeleted)
                .ToListAsync();

            var result = new DailyPriceListDto
            {
                PriceDate = date,
                Prices = new List<DailyProductPriceDto>()
            };

            foreach (var product in products)
            {
                var dailyPrice = dailyPrices.FirstOrDefault(dp => dp.ProductId == product.Id);
                var prevPrice = previousPrices.FirstOrDefault(dp => dp.ProductId == product.Id);

                var dto = new DailyProductPriceDto
                {
                    Id = dailyPrice?.Id ?? Guid.Empty,
                    ProductId = product.Id,
                    ProductName = product.Name,
                    ProductCode = product.Code,
                    CategoryName = product.ProductCategory?.Name,
                    BrandName = product.Brand?.Name,
                    UnitName = product.Unit?.Name,
                    ImagePath = product.ProductUrl,
                    PriceDate = date,
                    BaseSalesPrice = product.SalesPrice,
                    IsActive = dailyPrice?.IsActive ?? true,
                    Mrp = dailyPrice?.Mrp ?? product.Mrp
                };

                // Logic to determine Status and Prices
                if (dailyPrice != null)
                {
                    dto.SalesPrice = dailyPrice.SalesPrice;
                    dto.Status = "Updated";
                }
                else
                {
                    dto.Status = "Pending";
                    // Fallback Logic
                    if (prevPrice != null)
                    {
                        dto.SalesPrice = prevPrice.SalesPrice;
                        dto.PreviousDayPrice = prevPrice.SalesPrice;
                    }
                    else
                    {
                        dto.SalesPrice = product.SalesPrice ?? 0;
                    }
                }
                
                if (prevPrice != null)
                {
                     dto.PreviousDayPrice = prevPrice.SalesPrice;
                }

                result.Prices.Add(dto);
            }

            // Calculate Summary
            result.Summary.TotalProducts = result.Prices.Count;
            result.Summary.UpdatedCount = result.Prices.Count(p => p.Status == "Updated");
            result.Summary.PendingCount = result.Prices.Count(p => p.Status == "Pending");
            result.Summary.UnchangedCount = result.Prices.Count(p => p.Status == "Unchanged"); // Logic for Unchanged needs refining if we track changes specifically

            return result;
        }

        public async Task<DailyProductPrice> GetProductPriceForDate(Guid productId, DateTime priceDate)
        {
            var tenantId = _tenantProvider.GetTenantId();
            return await _context.DailyProductPrices
                .FirstOrDefaultAsync(dp => dp.ProductId == productId && dp.PriceDate == priceDate.Date && dp.TenantId == tenantId && !dp.IsDeleted);
        }

        public async Task<decimal> GetEffectivePrice(Guid productId, DateTime priceDate)
        {
             var tenantId = _tenantProvider.GetTenantId();
             var date = priceDate.Date;
             
             // 1. Check Today
             var dailyPrice = await _context.DailyProductPrices
                 .Where(dp => dp.ProductId == productId && dp.PriceDate == date && dp.TenantId == tenantId && !dp.IsDeleted)
                 .Select(dp => dp.SalesPrice)
                 .FirstOrDefaultAsync();
             
             if (dailyPrice != 0) return dailyPrice; // Assuming 0 is not a valid price, or check for null if we change return type

             // 2. Check Yesterday
             var prevDate = date.AddDays(-1);
             var prevPrice = await _context.DailyProductPrices
                 .Where(dp => dp.ProductId == productId && dp.PriceDate == prevDate && dp.TenantId == tenantId && !dp.IsDeleted)
                 .Select(dp => dp.SalesPrice)
                 .FirstOrDefaultAsync();

             if (prevPrice != 0) return prevPrice;

             // 3. Fallback to Base
             var basePrice = await _context.Products
                 .Where(p => p.Id == productId)
                 .Select(p => p.SalesPrice)
                 .FirstOrDefaultAsync();

             return basePrice ?? 0;
        }

        public async Task<bool> BulkUpsertDailyPrices(List<DailyProductPrice> prices)
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (!tenantId.HasValue)
            {
                throw new InvalidOperationException("TenantId is null. Cannot update prices.");
            }

            foreach (var price in prices)
            {
                var existing = await _context.DailyProductPrices
                    .FirstOrDefaultAsync(dp => dp.ProductId == price.ProductId && dp.PriceDate == price.PriceDate && dp.TenantId == tenantId);

                if (existing != null)
                {
                    existing.SalesPrice = price.SalesPrice;
                    existing.Mrp = price.Mrp;
                    existing.IsActive = price.IsActive;
                    existing.ModifiedDate = DateTime.UtcNow;
                    existing.ModifiedBy = _userInfoToken.Id;
                    _context.DailyProductPrices.Update(existing);
                }
                else
                {
                    if (price.Id == Guid.Empty)
                    {
                        price.Id = Guid.NewGuid();
                    }
                    price.TenantId = tenantId.Value; // Ensure tenant is set
                    price.CreatedDate = DateTime.UtcNow;
                    price.CreatedBy = _userInfoToken.Id;
                    await _context.DailyProductPrices.AddAsync(price);
                }
            }
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
