using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Data.Enums;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class UpdateSalesOrderReturnCommandHandler
        : IRequestHandler<UpdateSalesOrderReturnCommand, ServiceResponse<bool>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdateSalesOrderCommandHandler> _logger;
        private readonly IAccountingService _accountingService;
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly ITaxRepository _taxRepository;
        private readonly IProductRepository _productRepository;
        private readonly IPaymentService _paymentService;
        private readonly IFinancialYearRepository _financialYearRepository;
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ISalesOrderPaymentRepository _salesOrderPaymentRepository;

        public UpdateSalesOrderReturnCommandHandler(
            ISalesOrderRepository salesOrderRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdateSalesOrderCommandHandler> logger,
            IAccountingService accountingService,
            IUnitConversationRepository unitConversationRepository,
            ITaxRepository taxRepository,
            IProductRepository productRepository,
            IPaymentService paymentService,
            IFinancialYearRepository financialYearRepository,
            ISalesOrderItemRepository salesOrderItemRepository,
            ITransactionRepository transactionRepository,
            ISalesOrderPaymentRepository salesOrderPaymentRepository)
        {
            _salesOrderRepository = salesOrderRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _accountingService = accountingService;
            _unitConversationRepository = unitConversationRepository;
            _taxRepository = taxRepository;
            _productRepository = productRepository;
            _paymentService = paymentService;
            _financialYearRepository = financialYearRepository;
            _salesOrderItemRepository = salesOrderItemRepository;
            _transactionRepository = transactionRepository;
            _salesOrderPaymentRepository = salesOrderPaymentRepository;
        }

        public async Task<ServiceResponse<bool>> Handle(UpdateSalesOrderReturnCommand request, CancellationToken cancellationToken)
        {

            var salesOrderUpdate = _mapper.Map<POS.Data.SalesOrder>(request);
            salesOrderUpdate.SalesOrderItems.ForEach(item =>
            {
                item.Product = null;
                item.SalesOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
            });
            var salesOrderExit = await _salesOrderRepository.FindAsync(request.Id);

            salesOrderExit.SaleReturnNote = salesOrderUpdate.Note;
            salesOrderExit.Status = SalesOrderStatus.Return;
            salesOrderExit.TotalAmount = salesOrderExit.TotalAmount - salesOrderUpdate.TotalAmount;
            salesOrderExit.TotalTax = salesOrderExit.TotalTax - salesOrderUpdate.TotalTax;
            salesOrderExit.TotalDiscount = salesOrderExit.TotalDiscount - salesOrderUpdate.TotalDiscount;
            salesOrderExit.FlatDiscount = salesOrderExit.FlatDiscount - salesOrderUpdate.FlatDiscount;
            salesOrderExit.TotalRoundOff = salesOrderExit.TotalRoundOff;

            salesOrderExit.SalesOrderItems = new List<SalesOrderItem>();
            foreach (var saleOrderItem in salesOrderUpdate.SalesOrderItems)
            {
                salesOrderExit.SalesOrderItems.Add(new SalesOrderItem
                {
                    ProductId = saleOrderItem.ProductId,
                    PurchasePrice = saleOrderItem.PurchasePrice,
                    UnitPrice = saleOrderItem.UnitPrice,
                    UnitId = saleOrderItem.UnitId,
                    CreatedDate = DateTime.UtcNow,
                    Quantity = saleOrderItem.Quantity,
                    Status = Data.Entities.PurchaseSaleItemStatusEnum.Return,
                    Discount = saleOrderItem.Discount,
                    DiscountPercentage = saleOrderItem.DiscountPercentage,
                    DiscountType = saleOrderItem.DiscountType,
                    TaxValue = saleOrderItem.TaxValue,
                    SalesOrderItemTaxes = saleOrderItem.SalesOrderItemTaxes.Any()
                            ? saleOrderItem.SalesOrderItemTaxes
                                .Select(tax => new SalesOrderItemTax
                                {
                                    TaxId = tax.TaxId,
                                    TaxValue = tax.TaxValue,
                                    Tax = null
                                })
                                .ToList()
                            : null

                });
            }
            //salesOrderExit.SalesOrderItems = salesOrderUpdate.SalesOrderItems;
            //salesOrderExit.SalesOrderItems.ForEach(c =>
            //{
            //    c.SalesOrderId = salesOrderUpdate.Id;
            //    c.CreatedDate = DateTime.UtcNow;
            //    c.Status = PurchaseSaleItemStatusEnum.Return;
            //    c.SalesOrderItemTaxes = null;
            //});

            if (salesOrderExit.TotalAmount <= salesOrderExit.TotalPaidAmount)
            {
                salesOrderExit.PaymentStatus = PaymentStatus.Paid;
            }
            else if (salesOrderExit.TotalPaidAmount > 0)
            {
                salesOrderExit.PaymentStatus = PaymentStatus.Partial;
            }
            else
            {
                salesOrderExit.PaymentStatus = PaymentStatus.Pending;
            }

            _salesOrderRepository.Update(salesOrderExit);

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while Updating Sales Order.");
                return ServiceResponse<bool>.Return500();
            }
            var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();

            var taxEntities = await _taxRepository.All.Select(c => new TaxDto
            {
                Id = c.Id,
                Name = c.Name,
                Percentage = c.Percentage
            }).ToListAsync();
            // Accounting Entries
            try
            {
                var transactionItems = new List<TransactionItemDto>();
                foreach (var item in request.SalesOrderItems)
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
                        TaxPercentage = totalTaxPercentage,
                        UnitId = baseConversion.UnitId,
                        TaxIds = taxIdsFromRequest,
                        PurchasePrice = item.PurchasePrice,
                        DiscountType = item.DiscountType
                    };
                    transactionItems.Add(transactionItem);
                }

                var transactionDto = new CreateTransactionDto
                {
                    BranchId = salesOrderUpdate.LocationId,
                    Narration = "Sales Order item Return",
                    ReferenceNumber = salesOrderUpdate.OrderNumber,
                    TransactionDate = DateTime.UtcNow,
                    TransactionType = TransactionType.SaleReturn,
                    FlatDiscount = request.FlatDiscount,
                    Items = transactionItems,
                    RoundOffAmount = request.TotalRoundOff
                };
                var transitionReturn = await _accountingService.ProcessTransactionAsync(transactionDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Sales Order Return Accounting");
            }

            try
            {
                var remainingPayment = salesOrderExit.TotalAmount - salesOrderExit.TotalPaidAmount + salesOrderExit.TotalRefundAmount;

                if (remainingPayment < 0
                    && request.IsSelectPaymentMethod
                    && (salesOrderExit.PaymentStatus == PaymentStatus.Paid || salesOrderExit.PaymentStatus == PaymentStatus.Partial) && salesOrderExit.TotalPaidAmount > 0)
                {
                    decimal refundAmount = salesOrderExit.TotalPaidAmount - salesOrderExit.TotalAmount - salesOrderExit.TotalRefundAmount;
                    request.TotalAmount = refundAmount;
                    if (refundAmount > 0)
                    {
                        try
                        {
                            var paymentDto = new PaymentDto
                            {
                                BranchId = salesOrderExit.LocationId,
                                Amount = refundAmount,
                                Notes = request.Note,
                                OrderNumber = salesOrderExit.OrderNumber,
                                PaymentDate = DateTime.UtcNow,
                                PaymentMethod = request.PaymentMethod,
                                ReferenceNumber = salesOrderExit.OrderNumber,
                                TransactionType = TransactionType.SaleReturn,
                            };
                            var salesOrderPayment = new Data.SalesOrderPayment
                            {
                                Amount = refundAmount,
                                PaymentDate = DateTime.UtcNow,
                                PaymentMethod = request.PaymentMethod,
                                SalesOrderId = salesOrderExit.Id,
                                ReferenceNumber = salesOrderExit.OrderNumber,
                                PaymentType = PaymentType.Refund
                            };

                            var saleOrder = _salesOrderRepository.Find(salesOrderExit.Id);
                            saleOrder.TotalRefundAmount = salesOrderExit.TotalRefundAmount + request.TotalAmount;
                            _salesOrderRepository.Update(saleOrder);
                            _salesOrderPaymentRepository.Add(salesOrderPayment);
                            await _paymentService.ProcessPaymentAsync(paymentDto);

                        }
                        catch (System.Exception ex)
                        {
                            _logger.LogError(ex, "error while saving the purchase order payment accounting.");
                        }
                    }
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Sales Order Return payment Accounting");
            }

            return ServiceResponse<bool>.ReturnResultWith201(true);
        }
    }
}
