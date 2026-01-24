using System;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Domain;
using POS.Repository.Stock;

namespace POS.Repository
{
    public class DamagedStockRepository : GenericRepository<DamagedStock, POSDbContext>, IDamagedStockRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;

        public DamagedStockRepository(
            IUnitOfWork<POSDbContext> uow, IPropertyMappingService propertyMappingService) : base(uow)
        {
            _propertyMappingService = propertyMappingService;
        }

        public async Task<DamagedStockList> GetAllDamagedStocks(DamagedStockResource damagedStockResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Product, cs => cs.CreatedByUser, cs => cs.Location, cs => cs.ReportedBy).ApplySort(damagedStockResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<DamagedStockDto, DamagedStock>());

            if (!string.IsNullOrWhiteSpace(damagedStockResource.ProductId))
            {
                // trim & ignore casing
                var genreForWhereClause = damagedStockResource.ProductId
                    .Trim().ToLowerInvariant();
                var name = Uri.UnescapeDataString(genreForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Product.Name, $"{encodingName}%") || EF.Functions.Like(a.Product.Barcode, $"{encodingName}%"));
            }

            if (damagedStockResource.DamagedDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.DamagedDate == damagedStockResource.DamagedDate);
            }

            if (damagedStockResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == damagedStockResource.LocationId);
            }


            var salesOrders = new DamagedStockList();
            return await salesOrders
                .Create(collectionBeforePaging, damagedStockResource.Skip, damagedStockResource.PageSize);
        }
    }
}
