using AutoMapper;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.Domain;
using POS.Helper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace POS.Repository
{
    public class SupplierRepository : GenericRepository<Supplier, POSDbContext>, ISupplierRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        private readonly IMapper _mapper;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly UserInfoToken _userInfoToken;
        public SupplierRepository(
            IUnitOfWork<POSDbContext> uow,
            IPropertyMappingService propertyMappingService,
             IMapper mapper,
             IPurchaseOrderRepository purchaseOrderRepository,
             UserInfoToken userInfoToken)
            : base(uow)
        {
            _mapper = mapper;
            _propertyMappingService = propertyMappingService;
            _purchaseOrderRepository = purchaseOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<SupplierList> GetSuppliers(SupplierResource supplierResource)
        {
            var collectionBeforePaging =
                All.Include(c=>c.BillingAddress).ApplySort(supplierResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<SupplierDto, Supplier>());

            if (supplierResource.Id != null)
            {
                // trim & ignore casing
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Id == supplierResource.Id);
            }

            if (!string.IsNullOrEmpty(supplierResource.SupplierName))
            {
                // trim & ignore casing
                var genreForWhereClause = supplierResource.SupplierName
                    .Trim().ToLowerInvariant();
                var name = Uri.UnescapeDataString(genreForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.SupplierName.ToLower(), $"{encodingName}%"));
            }

            if (!string.IsNullOrEmpty(supplierResource.MobileNo))
            {
                // trim & ignore casing
                var searchQueryForWhereClause = supplierResource.MobileNo
                    .Trim().ToLowerInvariant();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => (a.MobileNo != null && EF.Functions.Like(a.MobileNo.ToLower(), $"%{searchQueryForWhereClause}%")) ||
                    (a.PhoneNo != null && EF.Functions.Like(a.PhoneNo.ToLower(), $"%{searchQueryForWhereClause}%")));
            }
            if (!string.IsNullOrEmpty(supplierResource.Email))
            {
                // trim & ignore casing
                var searchQueryForWhereClause = supplierResource.Email
                    .Trim().ToLowerInvariant();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Email.ToLower(), $"{searchQueryForWhereClause}%"));
            }
            if (!string.IsNullOrEmpty(supplierResource.Website))
            {
                // trim & ignore casing
                var searchQueryForWhereClause = supplierResource.Website
                    .Trim().ToLowerInvariant();

                var name = Uri.UnescapeDataString(searchQueryForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Website.ToLower(), $"%{encodingName}%"));
            }
            if (!string.IsNullOrEmpty(supplierResource.SearchQuery))
            {
                var searchQueryForWhereClause = supplierResource.SearchQuery
              .Trim().ToLowerInvariant();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a =>
                    EF.Functions.Like(a.SupplierName.ToLower(), $"%{searchQueryForWhereClause}%")
                    || (a.MobileNo != null && EF.Functions.Like(a.MobileNo.ToLower(), $"%{searchQueryForWhereClause}%"))
                    || (a.PhoneNo != null && EF.Functions.Like(a.PhoneNo.ToLower(), $"%{searchQueryForWhereClause}%"))
                    );
            }

            var SupplierList = new SupplierList(_mapper);
            return await SupplierList.Create(collectionBeforePaging, supplierResource.Skip, supplierResource.PageSize);
        }

        public async Task<SupplierPaymentList> GetSuppliersPayment(SupplierResource supplierResource)
        {
            var locationIds = new List<Guid>();
            if (supplierResource.LocationId != null)
            {
                locationIds.Add(supplierResource.LocationId.Value);
            }
            else
            {
                locationIds = _userInfoToken.LocationIds;
            }

            var collectionBeforePaging =
                _purchaseOrderRepository
                .AllIncluding(c => c.Supplier)
                .ApplySort(supplierResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<PurchaseOrderDto, PurchaseOrder>());

            collectionBeforePaging = collectionBeforePaging.Where(c => locationIds.Contains(c.LocationId));

            if (!string.IsNullOrEmpty(supplierResource.SupplierName))
            {
                // trim & ignore casing
                var genreForWhereClause = supplierResource.SupplierName
                    .Trim().ToLowerInvariant();
                var name = Uri.UnescapeDataString(genreForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Supplier.SupplierName.ToLower(), $"{encodingName}%"));
            }

            var groupedCollection = collectionBeforePaging.GroupBy(c => c.SupplierId);

            var supplierPayments = new SupplierPaymentList();
            return await supplierPayments.Create(groupedCollection, supplierResource.Skip, supplierResource.PageSize);
        }
    }
}
