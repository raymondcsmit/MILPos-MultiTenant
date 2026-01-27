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
using POS.MediatR.SalesOrderPayment.Command;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class AddSalesOrderCommandHandler : IRequestHandler<AddSalesOrderCommand, ServiceResponse<SalesOrderDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddSalesOrderCommandHandler> _logger;
        private readonly IAccountingService _accountingService;
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly ITaxRepository _taxRepository;
        private readonly IProductStockRepository _productStockRepository;
        private readonly IProductRepository _productRepository;
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly IMediator _mediator;
        public AddSalesOrderCommandHandler(
            ISalesOrderRepository salesOrderRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<AddSalesOrderCommandHandler> logger,
            IAccountingService accountingService,
            IUnitConversationRepository unitConversationRepository,
            ITaxRepository taxRepository,
            IProductStockRepository productStockRepository,
            IProductRepository productRepository,
            ISalesOrderItemRepository salesOrderItemRepository,
            IMediator mediator)
        {
            _salesOrderRepository = salesOrderRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _accountingService = accountingService;
            _unitConversationRepository = unitConversationRepository;
            _taxRepository = taxRepository;
            _productStockRepository = productStockRepository;
            _productRepository = productRepository;
            _salesOrderItemRepository = salesOrderItemRepository;
            _mediator = mediator;
        }

        public async Task<ServiceResponse<SalesOrderDto>> Handle(AddSalesOrderCommand request, CancellationToken cancellationToken)
        {

            var existingSONumber = _salesOrderRepository.All.Any(c => c.OrderNumber == request.OrderNumber);
            if (existingSONumber)
            {
                return ServiceResponse<SalesOrderDto>.Return409("Sales Order Number is already Exists.");
            }

            var salesOrder = _mapper.Map<POS.Data.SalesOrder>(request);
            salesOrder.PaymentStatus = PaymentStatus.Pending;
            salesOrder.SalesOrderItems.ForEach(item =>
            {
                item.Product = null;
                item.SalesOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
                item.CreatedDate = DateTime.UtcNow;
            });
            if (request.TotalAmount == 0)
            {
                salesOrder.PaymentStatus = PaymentStatus.Paid;
            }

            // FBR Integration Logic
            try 
            {
                var location = await _uow.Context.Set<POS.Data.Entities.Location>()
                    .FirstOrDefaultAsync(l => l.Id == salesOrder.LocationId, cancellationToken);

                if (location != null && location.IsFBREnabled && location.AutoSubmitInvoices)
                {
                    salesOrder.FBRStatus = POS.Data.Entities.FBR.FBRSubmissionStatus.Queued;
                    salesOrder.BuyerNTN = request.BuyerNTN;
                    salesOrder.BuyerCNIC = request.BuyerCNIC;
                    salesOrder.BuyerName = !string.IsNullOrEmpty(request.BuyerName) ? request.BuyerName : "Walk-in Customer";
                    salesOrder.BuyerPhoneNumber = request.BuyerPhoneNumber;
                    salesOrder.BuyerAddress = request.BuyerAddress;
                    salesOrder.SaleType = !string.IsNullOrEmpty(request.SaleType) ? request.SaleType : "Retail";
                    
                    _logger.LogInformation("Sales Order {OrderNumber} queued for FBR submission (Location: {LocationName})", salesOrder.OrderNumber, location.Name);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring FBR status for Sales Order {OrderNumber}", salesOrder.OrderNumber);
            }

            _salesOrderRepository.Add(salesOrder);

            // Collect all productIds from salesOrder items
            var productIds = salesOrder.SalesOrderItems
                .Select(i => i.ProductId)
                .ToList();

            var productStocks = await _productStockRepository.All.Where(p => productIds.Contains(p.ProductId) && p.LocationId == request.LocationId)
                .ToListAsync(cancellationToken);

            foreach (var saleitem in salesOrder.SalesOrderItems)
            {
                saleitem.Product = null;
                saleitem.CreatedDate = DateTime.UtcNow;
                saleitem.SalesOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
                // Get product 
                var productStock = productStocks.FirstOrDefault(p => p.ProductId == saleitem.ProductId);
                if (productStock != null)
                {
                    saleitem.PurchasePrice = productStock.PurchasePrice;
                }
            }

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while creating Sales Order.");
                return ServiceResponse<SalesOrderDto>.Return500();
            }
            _uow.Context.Entry(salesOrder).State = EntityState.Detached;
            try
            {
                // Accounting Entries
                if (!request.IsSalesOrderRequest)
                {
                    var transactionItems = new List<TransactionItemDto>();

                    var taxEntities = await _taxRepository.All.Select(c => new TaxDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Percentage = c.Percentage
                    }).ToListAsync();
                    foreach (var item in salesOrder.SalesOrderItems)
                    {
                        var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);
                        decimal totalTaxPercentage = 0.00m;
                        var taxIdsFromRequest = item.SalesOrderItemTaxes
                                .Select(t => t.TaxId)
                                .ToList();

                        // Check if item has any taxes
                        if (item.SalesOrderItemTaxes != null && item.SalesOrderItemTaxes.Any())
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
                            DiscountType = item.DiscountType,
                            TaxPercentage = totalTaxPercentage,
                            UnitId = baseConversion.UnitId,
                            TaxIds = taxIdsFromRequest,
                            PurchasePrice = item.PurchasePrice
                        };
                        transactionItems.Add(transactionItem);
                    }
                    var transactionDto = new CreateTransactionDto
                    {
                        BranchId = salesOrder.LocationId,
                        Narration = "Sales Order",
                        ReferenceNumber = salesOrder.OrderNumber,
                        TransactionDate = DateTime.UtcNow,
                        TransactionType = TransactionType.Sale,
                        FlatDiscount = request.FlatDiscount,
                        Items = transactionItems,
                        RoundOffAmount = request.TotalRoundOff
                    };

                    await _accountingService.ProcessTransactionAsync(transactionDto);
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Sales Order Accounting");
            }

            var dto = _mapper.Map<SalesOrderDto>(salesOrder);
            if (request.IsPOSScreenOrder && request.PaymentMethod != ACCPaymentMethod.Credit)
            {
                var addSalesOrderPaymentCommand = new AddSalesOrderPaymentCommand
                {
                    SalesOrderId = dto.Id,
                    ReferenceNumber = request.ReferenceNumber,
                    PaymentDate = DateTime.UtcNow,
                    PaymentMethod = request.PaymentMethod,
                    Note = request.Note,
                    Amount = dto.TotalAmount
                };
                await _mediator.Send(addSalesOrderPaymentCommand);
            }
            return ServiceResponse<SalesOrderDto>.ReturnResultWith201(dto);
        }
    }
}

