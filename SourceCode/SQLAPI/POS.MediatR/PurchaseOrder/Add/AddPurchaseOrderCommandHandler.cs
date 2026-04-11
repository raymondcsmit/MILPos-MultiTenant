using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class AddPurchaseOrderCommandHandler : IRequestHandler<AddPurchaseOrderCommand, ServiceResponse<PurchaseOrderDto>>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddPurchaseOrderCommandHandler> _logger;
        private readonly IAccountingService _accountingService;
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly ITaxRepository _taxRepository;
        private readonly IProductRepository _productRepository;
        private readonly IProductStockRepository _productStockRepository;
        private readonly UserInfoToken _userInfoToken;

        public AddPurchaseOrderCommandHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<AddPurchaseOrderCommandHandler> logger,
            IAccountingService accountingService,
            IUnitConversationRepository unitConversationRepository,
            ITaxRepository taxRepository,
            IProductRepository productRepository,
            IProductStockRepository productStockRepository,
            UserInfoToken userInfoToken)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _accountingService = accountingService;
            _unitConversationRepository = unitConversationRepository;
            _taxRepository = taxRepository;
            _productRepository = productRepository;
            _productStockRepository = productStockRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<ServiceResponse<PurchaseOrderDto>> Handle(AddPurchaseOrderCommand request, CancellationToken cancellationToken)
        {

            var existingPONumber = _purchaseOrderRepository.All.Any(c => c.OrderNumber == request.OrderNumber);
            if (existingPONumber)
            {
                return ServiceResponse<PurchaseOrderDto>.Return409("Purchase Order Number is already Exists.");
            }

            var purchaseOrder = _mapper.Map<POS.Data.PurchaseOrder>(request);
            purchaseOrder.PaymentStatus = PaymentStatus.Pending;

            // Handle Sales Person Attribution
            var isRestrictedUser = _userInfoToken.LocationIds != null && _userInfoToken.LocationIds.Any();
            if (isRestrictedUser)
            {
                // Force attribution to the logged-in sales person to prevent spoofing
                purchaseOrder.SalesPersonId = _userInfoToken.Id;
            }
            else
            {
                // Allow admin/manager to attribute the purchase "on behalf of"
                purchaseOrder.SalesPersonId = request.SalesPersonId;
            }

            purchaseOrder.PurchaseOrderItems.ForEach(item =>
            {
                item.Product = null;
                item.PurchaseOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
                item.CreatedDate = DateTime.UtcNow;
            });
            if (request.TotalAmount == 0)
            {
                purchaseOrder.PaymentStatus = PaymentStatus.Paid;
            }
            _purchaseOrderRepository.Add(purchaseOrder);

            if (!request.IsPurchaseOrderRequest)
            {
                //Update PurchasePrice in Product 
                foreach (var item in request.PurchaseOrderItems)
                {
                    var Product = await _productRepository.All.Where(c => c.Id == item.ProductId).FirstOrDefaultAsync();
                    var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);

                    if (Product != null)
                    {
                        Product.PurchasePrice = baseConversion.BaseUnitPrice;
                        _productRepository.Update(Product);
                    }
                }

            }
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while creating Purchase Order.");
                return ServiceResponse<PurchaseOrderDto>.Return500();
            }
            try
            {
                if (!request.IsPurchaseOrderRequest)
                {
                    // Accounting Entries
                    var transactionItems = new List<TransactionItemDto>();
                    var taxEntities = await _taxRepository.All.Select(c => new TaxDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Percentage = c.Percentage,

                    }).ToListAsync();
                    foreach (var item in request.PurchaseOrderItems)
                    {
                        var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);
                        decimal totalTaxPercentage = 0.00m;
                        // Check if item has any taxes
                        var taxIdsFromRequest = item.PurchaseOrderItemTaxes
                             .Select(t => t.TaxId)
                             .ToList();

                        if (item.PurchaseOrderItemTaxes != null && item.PurchaseOrderItemTaxes.Any())
                        {

                            totalTaxPercentage = taxEntities
                                .Where(dbTax => taxIdsFromRequest.Contains(dbTax.Id))
                                .Sum(dbTax => dbTax.Percentage);

                        }
                        var transactionItem = new TransactionItemDto
                        {
                            InventoryItemId = item.ProductId,
                            Quantity = baseConversion.BaseQuantity,
                            UnitPrice = baseConversion.BaseUnitPrice,
                            DiscountPercentage = item.DiscountPercentage,
                            TaxPercentage = totalTaxPercentage,
                            UnitId = baseConversion.UnitId,
                            TaxIds = taxIdsFromRequest,
                            PurchasePrice = baseConversion.BaseUnitPrice,
                            DiscountType = item.DiscountType,
                        };
                        transactionItems.Add(transactionItem);
                    }
                    var transactionDto = new CreateTransactionDto
                    {
                        BranchId = purchaseOrder.LocationId,
                        Narration = "Purchase order",
                        ReferenceNumber = purchaseOrder.OrderNumber,
                        TransactionDate = DateTime.UtcNow,
                        TransactionType = TransactionType.Purchase,
                        Items = transactionItems,
                        RoundOffAmount = purchaseOrder.TotalRoundOff
                    };
                    await _accountingService.ProcessTransactionAsync(transactionDto);

                }

            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Purchase order accounting");
            }
            var dto = _mapper.Map<PurchaseOrderDto>(purchaseOrder);
            return ServiceResponse<PurchaseOrderDto>.ReturnResultWith201(dto);
        }
    }
}
