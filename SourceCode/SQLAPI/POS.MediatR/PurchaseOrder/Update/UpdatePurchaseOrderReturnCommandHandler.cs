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
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class UpdatePurchaseOrderReturnCommandHandler : IRequestHandler<UpdatePurchaseOrderReturnCommand, ServiceResponse<bool>>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdatePurchaseOrderReturnCommandHandler> _logger;
        private readonly IAccountingService _accountingService;
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly ITaxRepository _taxRepository;
        private readonly IPaymentService _paymentService;
        private readonly ITransactionRepository _transactionRepository;
        private readonly IFinancialYearRepository _financialYearRepository;
        private readonly IPurchaseOrderPaymentRepository _purchaseOrderPaymentRepository;

        public UpdatePurchaseOrderReturnCommandHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            IPurchaseOrderItemRepository purchaseOrderItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdatePurchaseOrderReturnCommandHandler> logger,
            IAccountingService accountingService,
            IUnitConversationRepository unitConversationRepository,
            ITaxRepository taxRepository,
            IPaymentService paymentService,
            ITransactionRepository transactionRepository,
            IPaymentEntryRepository paymentEntryRepository,
            IFinancialYearRepository financialYearRepository,
            IPurchaseOrderPaymentRepository purchaseOrderPaymentRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;

            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _accountingService = accountingService;
            _unitConversationRepository = unitConversationRepository;
            _taxRepository = taxRepository;
            _paymentService = paymentService;
            _transactionRepository = transactionRepository;
            _financialYearRepository = financialYearRepository;
            _purchaseOrderPaymentRepository = purchaseOrderPaymentRepository;
        }

        //public async Task<ServiceResponse<bool>> Handle(UpdatePurchaseOrderReturnCommand request, CancellationToken cancellationToken)
        //{
        //    var purchaseOrderExit = _purchaseOrderRepository.AllIncluding(c => c.PurchaseOrderItems).FirstOrDefault(c => c.Id == request.Id);

        //    var purchaseOrderUpdate = _mapper.Map<POS.Data.PurchaseOrder>(request);


        //    purchaseOrderExit.Status = PurchaseOrderStatus.Return;
        //    purchaseOrderExit.TotalAmount = purchaseOrderExit.TotalAmount - purchaseOrderUpdate.TotalAmount;
        //    purchaseOrderExit.TotalTax = purchaseOrderExit.TotalTax - purchaseOrderUpdate.TotalTax;
        //    purchaseOrderExit.TotalDiscount = purchaseOrderExit.TotalDiscount - purchaseOrderUpdate.TotalDiscount;
        //    purchaseOrderExit.PurchaseOrderItems = purchaseOrderUpdate.PurchaseOrderItems;
        //    purchaseOrderExit.PurchaseReturnNote = purchaseOrderUpdate.Note;
        //    purchaseOrderExit.TotalRoundOff = request.TotalRoundOff;
        //    if (request.IsSelectPaymentMethod)
        //    {
        //        purchaseOrderExit.TotalRefundAmount = purchaseOrderExit.TotalRefundAmount + purchaseOrderUpdate.TotalAmount;
        //    }

        //    purchaseOrderUpdate.PurchaseOrderItems.ForEach(c =>
        //    {
        //        c.PurchaseOrderId = purchaseOrderUpdate.Id;
        //    });
        //    purchaseOrderExit.PurchaseOrderItems.ForEach(item =>
        //    {
        //        item.Product = null;
        //        item.PurchaseOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
        //        item.CreatedDate = DateTime.UtcNow;
        //        item.Status = PurchaseSaleItemStatusEnum.Return;
        //    });

        //    if (purchaseOrderExit.TotalAmount <= purchaseOrderExit.TotalPaidAmount)
        //    {
        //        purchaseOrderExit.PaymentStatus = PaymentStatus.Paid;
        //    }
        //    else if (purchaseOrderExit.TotalPaidAmount > 0)
        //    {
        //        purchaseOrderExit.PaymentStatus = PaymentStatus.Partial;
        //    }
        //    else
        //    {
        //        purchaseOrderExit.PaymentStatus = PaymentStatus.Pending;
        //    }
        //    _purchaseOrderRepository.Update(purchaseOrderExit);

        //    //Current financial Year
        //    var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();
        //    var taxEntities = await _taxRepository.All.Select(c => new TaxDto
        //    {
        //        Id = c.Id,
        //        Name = c.Name,
        //        Percentage = c.Percentage
        //    }).ToListAsync();
        //    try
        //    {
        //        // Accounting Entries
        //        var transactionItems = new List<TransactionItemDto>();
        //        foreach (var item in request.PurchaseOrderItems)
        //        {
        //            var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);
        //            decimal totalTaxPercentage = 0.00m;
        //            var taxIdsFromRequest = item.PurchaseOrderItemTaxes
        //                   .Select(t => t.TaxId)
        //                   .ToList();
        //            // Check if item has any taxes
        //            if (item.PurchaseOrderItemTaxes != null && item.PurchaseOrderItemTaxes.Any())
        //            {
        //                totalTaxPercentage = taxEntities
        //                    .Where(dbTax => taxIdsFromRequest.Contains(dbTax.Id))
        //                    .Sum(dbTax => dbTax.Percentage);
        //            }
        //            var transactionItem = new TransactionItemDto
        //            {
        //                InventoryItemId = item.ProductId,
        //                Quantity = baseConversion.BaseQuantity,
        //                UnitPrice = baseConversion.BaseUnitPrice,
        //                DiscountPercentage = item.DiscountPercentage,
        //                TaxPercentage = totalTaxPercentage,
        //                UnitId = baseConversion.UnitId,
        //                TaxIds = taxIdsFromRequest,
        //                DiscountType = item.DiscountType
        //            };
        //            transactionItems.Add(transactionItem);
        //        }
        //        var transactionDto = new CreateTransactionDto
        //        {
        //            BranchId = purchaseOrderUpdate.LocationId,
        //            Narration = "Purchase order return",
        //            ReferenceNumber = purchaseOrderUpdate.OrderNumber,
        //            TransactionDate = DateTime.UtcNow,
        //            TransactionType = TransactionType.PurchaseReturn,
        //            Items = transactionItems,
        //            RoundOffAmount = request.TotalRoundOff
        //        };
        //        var transitionReturn = await _accountingService.ProcessTransactionAsync(transactionDto);

        //        var transition = _transactionRepository.All
        //            .Where(c => c.ReferenceNumber == purchaseOrderExit.OrderNumber && c.TransactionType == TransactionType.Purchase)
        //            .FirstOrDefault();
        //        if (transition != null)
        //        {
        //            transition.ReturnItemsAmount = transition.ReturnItemsAmount + transitionReturn.TotalAmount;
        //            _transactionRepository.Update(transition);
        //            if (await _uow.SaveAsync() <= -1)
        //            {

        //            }
        //        }

        //    }
        //    catch (System.Exception ex)
        //    {
        //        _logger.LogError(ex, "error while saving Purchase Order Return Accounting");
        //    }
        //    // Payment Refund Accounting 
        //    try
        //    {
        //        if (request.IsSelectPaymentMethod && (purchaseOrderExit.PaymentStatus == PaymentStatus.Paid || purchaseOrderExit.PaymentStatus == PaymentStatus.Partial) && purchaseOrderExit.TotalPaidAmount > 0)
        //        {
        //            decimal alreadyPaidAmount = Math.Round(purchaseOrderExit.TotalPaidAmount - purchaseOrderExit.TotalRefundAmount);
        //            decimal totalOrderAmount = Math.Round(request.TotalAmount);

        //            // Refund minimum  amount both of them 
        //            decimal refundAmount = Math.Min(alreadyPaidAmount, totalOrderAmount);
        //            request.TotalAmount = refundAmount;
        //            try
        //            {
        //                var paymentDto = new PaymentDto
        //                {
        //                    BranchId = purchaseOrderExit.LocationId,
        //                    Amount = refundAmount,
        //                    Notes = request.Note,
        //                    OrderNumber = purchaseOrderExit.OrderNumber,
        //                    PaymentDate = DateTime.UtcNow,
        //                    PaymentMethod = request.PaymentMethod,
        //                    ReferenceNumber = purchaseOrderExit.OrderNumber,
        //                    TransactionType = TransactionType.PurchaseReturn,
        //                };
        //                await _paymentService.ProcessPaymentAsync(paymentDto);
        //            }
        //            catch (System.Exception ex)
        //            {
        //                _logger.LogError(ex, "error while saving the purchase order payment accounting.");
        //            }
        //        }
        //    }
        //    catch (System.Exception ex)
        //    {
        //        _logger.LogError(ex, "error while saving the purchase order payment Refund Accounting.");
        //    }

        //    return ServiceResponse<bool>.ReturnResultWith201(true);
        //}

        public async Task<ServiceResponse<bool>> Handle(UpdatePurchaseOrderReturnCommand request, CancellationToken cancellationToken)
        {
            try
            {
                await _uow.BeginTransactionAsync();

                var purchaseOrderUpdate = _mapper.Map<POS.Data.PurchaseOrder>(request);
            purchaseOrderUpdate.PurchaseOrderItems.ForEach(item =>
            {
                item.Product = null;
                item.PurchaseOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
            });
            var purchaseOrderExit = await _purchaseOrderRepository.FindAsync(request.Id);
            decimal totalAmount= purchaseOrderExit.TotalAmount;
            purchaseOrderExit.PurchaseReturnNote = purchaseOrderUpdate.Note;
            purchaseOrderExit.Status = PurchaseOrderStatus.Return;
            purchaseOrderExit.TotalAmount = purchaseOrderExit.TotalAmount - purchaseOrderUpdate.TotalAmount;
            purchaseOrderExit.TotalTax = purchaseOrderExit.TotalTax - purchaseOrderUpdate.TotalTax;
            purchaseOrderExit.TotalDiscount = purchaseOrderExit.TotalDiscount - purchaseOrderUpdate.TotalDiscount;
            purchaseOrderExit.TotalRoundOff = purchaseOrderExit.TotalRoundOff;
            
            purchaseOrderExit.PurchaseOrderItems = new List<PurchaseOrderItem>();
            foreach (var purchaseOrderItem in purchaseOrderUpdate.PurchaseOrderItems)
            {
                purchaseOrderExit.PurchaseOrderItems.Add(new PurchaseOrderItem
                {
                    ProductId = purchaseOrderItem.ProductId,
                    UnitId = purchaseOrderItem.UnitId,
                    UnitPrice = purchaseOrderItem.UnitPrice,
                    CreatedDate = DateTime.UtcNow,
                    Quantity = purchaseOrderItem.Quantity,
                    Status = Data.Entities.PurchaseSaleItemStatusEnum.Return,
                    Discount = purchaseOrderItem.Discount,
                    DiscountPercentage = purchaseOrderItem.DiscountPercentage,
                    DiscountType = purchaseOrderItem.DiscountType,
                    TaxValue = purchaseOrderItem.TaxValue,
                    PurchaseOrderItemTaxes = purchaseOrderItem.PurchaseOrderItemTaxes.Any()
                            ? purchaseOrderItem.PurchaseOrderItemTaxes
                                .Select(tax => new PurchaseOrderItemTax
                                {
                                    TaxId = tax.TaxId,
                                    TaxValue = tax.TaxValue,
                                    Tax = null
                                })
                                .ToList()
                            : null

                });
            }

            if (purchaseOrderExit.TotalAmount <= purchaseOrderExit.TotalPaidAmount)
            {
                purchaseOrderExit.PaymentStatus = PaymentStatus.Paid;
            }
            else if (purchaseOrderExit.TotalPaidAmount > 0)
            {
                purchaseOrderExit.PaymentStatus = PaymentStatus.Partial;
            }
            else
            {
                purchaseOrderExit.PaymentStatus = PaymentStatus.Pending;
            }

            _purchaseOrderRepository.Update(purchaseOrderExit);

            if (await _uow.SaveAsync() <= 0)
            {
                await _uow.RollbackTransactionAsync();
                _logger.LogError("Error while Updating purchase Order.");
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
                foreach (var item in request.PurchaseOrderItems)
                {
                    var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);
                    decimal totalTaxPercentage = 0.00m;
                    var taxIdsFromRequest = item.PurchaseOrderItemTaxes
                           .Select(t => t.TaxId)
                           .ToList();

                    // Check if item has any taxes
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
                        DiscountType = item.DiscountType
                    };
                    transactionItems.Add(transactionItem);
                }

                var transactionDto = new CreateTransactionDto
                {
                    BranchId = purchaseOrderUpdate.LocationId,
                    Narration = "purchase Order item Return",
                    ReferenceNumber = purchaseOrderUpdate.OrderNumber,
                    TransactionDate = DateTime.UtcNow,
                    TransactionType = TransactionType.PurchaseReturn,
                    Items = transactionItems,
                    RoundOffAmount = request.TotalRoundOff
                };
                var transitionReturn = await _accountingService.ProcessTransactionAsync(transactionDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving purchase Order Return Accounting");
            }

            try
            {
                var remainingPayment = purchaseOrderExit.TotalAmount - purchaseOrderExit.TotalPaidAmount + purchaseOrderExit.TotalRefundAmount;

                if (remainingPayment < 0
                    && request.IsSelectPaymentMethod
                    && (purchaseOrderExit.PaymentStatus == PaymentStatus.Paid || purchaseOrderExit.PaymentStatus == PaymentStatus.Partial)
                    && purchaseOrderExit.TotalPaidAmount > 0)
                {
                    decimal refundAmount = purchaseOrderExit.TotalPaidAmount - purchaseOrderExit.TotalAmount - purchaseOrderExit.TotalRefundAmount;
                    request.TotalAmount = refundAmount;
                    if (refundAmount > 0)
                    {
                        try
                        {
                            var paymentDto = new PaymentDto
                            {
                                BranchId = purchaseOrderExit.LocationId,
                                Amount = refundAmount,
                                Notes = request.Note,
                                OrderNumber = purchaseOrderExit.OrderNumber,
                                PaymentDate = DateTime.UtcNow,
                                PaymentMethod = request.PaymentMethod,
                                ReferenceNumber = purchaseOrderExit.OrderNumber,
                                TransactionType = TransactionType.PurchaseReturn,
                            };

                            var purchasePayment = new Data.PurchaseOrderPayment
                            {
                                Id = Guid.NewGuid(),
                                Amount = refundAmount,
                                PaymentDate = DateTime.UtcNow,
                                PaymentMethod = request.PaymentMethod,
                                PurchaseOrderId = purchaseOrderExit.Id,
                                ReferenceNumber = purchaseOrderExit.OrderNumber,
                                PaymentType = Data.Enums.PaymentType.Refund
                            };
                            var purchaseOrder = _purchaseOrderRepository.Find(purchaseOrderExit.Id);
                            purchaseOrder.TotalRefundAmount = purchaseOrderExit.TotalRefundAmount + request.TotalAmount;
                            _purchaseOrderRepository.Update(purchaseOrder);
                            _purchaseOrderPaymentRepository.Add(purchasePayment);
                            await _paymentService.ProcessPaymentAsync(paymentDto);
                            
                            if (await _uow.SaveAsync() <= 0)
                            {
                                await _uow.RollbackTransactionAsync();
                                _logger.LogError("Error while Updating purchase Order Refund Payment.");
                                return ServiceResponse<bool>.Return500();
                            }

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
                _logger.LogError(ex, "error while saving purchase Order Return payment Accounting");
            }

            await _uow.CommitTransactionAsync();
            return ServiceResponse<bool>.ReturnResultWith201(true);
            }
            catch (System.Exception ex)
            {
                await _uow.RollbackTransactionAsync();
                _logger.LogError(ex, "Unhandled error during purchase order return update.");
                return ServiceResponse<bool>.ReturnException(ex);
            }
        }
    }
}

