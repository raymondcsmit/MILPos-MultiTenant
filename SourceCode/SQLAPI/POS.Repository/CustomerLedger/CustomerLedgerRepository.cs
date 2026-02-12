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

namespace POS.Repository
{
    public class CustomerLedgerRepository(IUnitOfWork<POSDbContext> uow,
        IPropertyMappingService _propertyMappingService) : GenericRepository<CustomerLedger, POSDbContext>(uow), ICustomerLedgerRepository
    {
        public async Task<CustomerLedgerList> GetAllCustomerLedger(CustomerLedgerResource customerLedgerResource)
        {
            var collectionBeforePaging = All
             .ApplySort(customerLedgerResource.OrderBy,
                 _propertyMappingService.GetPropertyMapping<CustomerLedgerDto, CustomerLedger>());
            if (customerLedgerResource.AccountId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.CustomerId == customerLedgerResource.AccountId);
            }
            if (customerLedgerResource.Date.HasValue)
            {
                var date = customerLedgerResource.Date.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Date >= customerLedgerResource.Date && a.Date < date);
            }
            if (customerLedgerResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == customerLedgerResource.LocationId);
            }
            if (!string.IsNullOrWhiteSpace(customerLedgerResource.Reference))
            {
                // trim & ignore casing
                var accountNameForWhereClause = customerLedgerResource.Reference
                    .Trim().ToLowerInvariant();
                var name = Uri.UnescapeDataString(accountNameForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Reference.ToLower(), $"{encodingName}%"));
            }
            var customerLedgerList = new CustomerLedgerList();
            return await customerLedgerList
                .Create(collectionBeforePaging, customerLedgerResource.Skip, customerLedgerResource.PageSize);
        }
    }
}
