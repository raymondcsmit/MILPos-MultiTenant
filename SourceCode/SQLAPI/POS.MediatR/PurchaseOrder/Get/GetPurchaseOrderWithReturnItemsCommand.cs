using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.PurchaseOrder.Get;

public class GetPurchaseOrderWithReturnItemsCommand : IRequest<List<PurchaseOrderItemDto>>
{
    public Guid Id { get; set; }
}

public class GetPurchaseOrderWithReturnItemsCommandHandler(
    IPurchaseOrderItemRepository purchaseOrderItemRepository,
    IMapper _mapper,
    Helper.PathHelper pathHelper) : IRequestHandler<GetPurchaseOrderWithReturnItemsCommand, List<PurchaseOrderItemDto>>
{
    public async Task<List<PurchaseOrderItemDto>> Handle(GetPurchaseOrderWithReturnItemsCommand request, CancellationToken cancellationToken)
    {

        var itemsQuery = purchaseOrderItemRepository.AllIncluding(c => c.Product, c => c.Product.Unit, cs => cs.PurchaseOrderItemTaxes)
            .Where(c => c.PurchaseOrderId == request.Id);

        var returnsItems = itemsQuery.Where(c => c.Status == PurchaseSaleItemStatusEnum.Return).ToList();

        var items = await itemsQuery
            .Where(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return)
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();

        var itemsDtos = _mapper.Map<List<PurchaseOrderItemDto>>(items);

        itemsDtos.ForEach(item =>
        {
            if (!string.IsNullOrWhiteSpace(item.Product.ProductUrl))
            {
                item.Product.ProductUrl = Path.Combine(pathHelper.ProductImagePath, item.Product.ProductUrl);
            }
            item.ReturnItemsQuantities = returnsItems.Count > 0 ? returnsItems
                                            .Where(d => d.ProductId == item.ProductId)
                                            .Sum(d => d.Quantity) : 0;
        });
        return itemsDtos;
    }
}

