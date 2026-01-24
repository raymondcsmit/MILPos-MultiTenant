using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class SalesOrderList : List<SalesOrderDto>
    {
        public SalesOrderList()
        {

        }
        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public SalesOrderList(List<SalesOrderDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<SalesOrderList> Create(IQueryable<SalesOrder> source, int skip, int pageSize)
        {

            var dtoList = await GetDtos(source, skip, pageSize);
            var count = pageSize == 0 || dtoList.Count() == 0 ? dtoList.Count() : await GetCount(source);
            var dtoPageList = new SalesOrderList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<SalesOrder> source)
        {
            try
            {
                return await source.AsNoTracking().CountAsync();
            }
            catch (Exception ex)
            {
                throw ex;
            }

        }

        public async Task<List<SalesOrderDto>> GetDtos(IQueryable<SalesOrder> source, int skip, int pageSize)
        {
            if (pageSize == 0)
            {
                var entities = await source
             .AsNoTracking()
             .Select(cs => new SalesOrderDto
             {
                 Id = cs.Id,
                 SOCreatedDate = cs.SOCreatedDate,
                 OrderNumber = cs.OrderNumber,
                 CustomerId = cs.CustomerId,
                 TotalAmount = cs.TotalAmount,
                 TotalDiscount = cs.TotalDiscount,
                 FlatDiscount = cs.FlatDiscount,
                 DeliveryStatus = cs.DeliveryStatus,
                 DeliveryDate = cs.DeliveryDate,
                 TotalTax = cs.TotalTax,
                 CustomerName = cs.Customer.CustomerName,
                 Status = cs.Status,
                 PaymentStatus = cs.PaymentStatus,
                 TotalPaidAmount = cs.TotalPaidAmount,
                 TotalRefundAmount = cs.TotalRefundAmount,
                 BusinessLocation = cs.Location.Name,
                 CreatedByName = $"{cs.CreatedByUser.FirstName} {cs.CreatedByUser.LastName}",
                 ModifiedDate = cs.ModifiedDate,
                 ReturnItemCount = cs.SalesOrderItems.Where(c => c.Status == PurchaseSaleItemStatusEnum.Return).Sum(c => c.Quantity),
                 ReturnItemPrice = Math.Round(cs.SalesOrderItems.Where(c => c.Status == PurchaseSaleItemStatusEnum.Return).Sum(c => (c.Quantity * c.UnitPrice) - c.Discount + c.TaxValue)),
                 TotalItemQuantities = cs.SalesOrderItems.Where(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return).Sum(c => c.Quantity)

             })
             .ToListAsync();
                return entities;
            }
            else
            {
                var entities = await source
              .Skip(skip)
              .Take(pageSize)
              .AsNoTracking()
              .Select(cs => new SalesOrderDto
              {
                  Id = cs.Id,
                  SOCreatedDate = cs.SOCreatedDate,
                  OrderNumber = cs.OrderNumber,
                  CustomerId = cs.CustomerId,
                  TotalAmount = cs.TotalAmount,
                  TotalDiscount = cs.TotalDiscount,
                  DeliveryStatus = cs.DeliveryStatus,
                  DeliveryDate = cs.DeliveryDate,
                  TotalTax = cs.TotalTax,
                  CustomerName = cs.Customer.CustomerName,
                  Status = cs.Status,
                  PaymentStatus = cs.PaymentStatus,
                  TotalPaidAmount = cs.TotalPaidAmount,
                  TotalRefundAmount = cs.TotalRefundAmount,
                  BusinessLocation = cs.Location.Name,
                  CreatedByName = $"{cs.CreatedByUser.FirstName} {cs.CreatedByUser.LastName}",
                  ModifiedDate = cs.ModifiedDate,
                  ReturnItemCount = cs.SalesOrderItems.Where(c => c.Status == PurchaseSaleItemStatusEnum.Return).Sum(c => c.Quantity),
                  ReturnItemPrice = Math.Round(cs.SalesOrderItems.Where(c => c.Status == PurchaseSaleItemStatusEnum.Return).Sum(c => (c.Quantity * c.UnitPrice) - c.Discount + c.TaxValue)),
                  TotalItemQuantities = cs.SalesOrderItems.Where(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return).Sum(c => c.Quantity)
              })
              .ToListAsync();
                return entities;
            }

        }
    }
}
