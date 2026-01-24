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
    public class UpdatePurchaseOrderCommandHandler : IRequestHandler<UpdatePurchaseOrderCommand, ServiceResponse<PurchaseOrderDto>>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IPurchaseOrderItemRepository _purchaseOrderItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdatePurchaseOrderCommandHandler> _logger;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ITransactionItemRepository _transactionItemRepository;
        private readonly IStockAdjustmentRepository _stockAdjustmentRepository;
        private readonly IPaymentEntryRepository _paymentEntryRepository;
        private readonly ITaxEntryRepository _taxEntryRepository;
        private readonly IAccountingEntryRepository _accountingEntryRepository;
        private readonly IInventoryService _inventoryService;
        private readonly IAccountingService _accountingService;
        private readonly ITaxRepository _taxRepository;
        private readonly IUnitConversationRepository _unitConversationRepository;


        public UpdatePurchaseOrderCommandHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            IPurchaseOrderItemRepository purchaseOrderItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdatePurchaseOrderCommandHandler> logger,
            ITransactionRepository transactionRepository,
            ITransactionItemRepository transactionItemRepository,
            IPaymentEntryRepository paymentEntryRepository,
            ITaxEntryRepository taxEntryRepository,
            IAccountingEntryRepository accountingEntryRepository,
            IInventoryService inventoryService,
            IAccountingService accountingService,
            ITaxRepository taxRepository,
            IUnitConversationRepository unitConversationRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _purchaseOrderItemRepository = purchaseOrderItemRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _transactionRepository = transactionRepository;
            _transactionItemRepository = transactionItemRepository;
            _paymentEntryRepository = paymentEntryRepository;
            _taxEntryRepository = taxEntryRepository;
            _accountingEntryRepository = accountingEntryRepository;
            _inventoryService = inventoryService;
            _accountingService = accountingService;
            _taxRepository = taxRepository;
            _unitConversationRepository = unitConversationRepository;
        }

        public async Task<ServiceResponse<PurchaseOrderDto>> Handle(UpdatePurchaseOrderCommand request, CancellationToken cancellationToken)
        {
            var existingPONumber = _purchaseOrderRepository.All.Any(c => c.OrderNumber == request.OrderNumber && c.Id != request.Id);
            if (existingPONumber)
            {
                return ServiceResponse<PurchaseOrderDto>.Return409("Purchase Order Number is already Exists.");
            }

            var purchaseOrderExit = await _purchaseOrderRepository.FindAsync(request.Id);
            if (purchaseOrderExit.Status == PurchaseOrderStatus.Return)
            {
                return ServiceResponse<PurchaseOrderDto>.Return409("Purchase Order can't edit becuase it's already return.");
            }

            if (purchaseOrderExit.DeliveryStatus == PurchaseDeliveryStatus.RECEIVED)
            {
                return ServiceResponse<PurchaseOrderDto>.Return409("Purchase Order can't edit becuase it's already received.");
            }

            if (purchaseOrderExit.PaymentStatus == PaymentStatus.Partial || purchaseOrderExit.PaymentStatus == PaymentStatus.Paid)
            {
                return ServiceResponse<PurchaseOrderDto>.Return409("Purchase Order can't edit becuase it's payment already received.");
            }

            var purchaseOrderItemsExist = await _purchaseOrderItemRepository.FindBy(c => c.PurchaseOrderId == request.Id).ToListAsync();

            try
            {
                //Remove accounting
                if (!purchaseOrderExit.IsPurchaseOrderRequest && (purchaseOrderExit.TotalAmount != request.TotalAmount || purchaseOrderExit.TotalTax != request.TotalTax || purchaseOrderExit.TotalDiscount != request.TotalDiscount))
                {
                    var transaction = await _transactionRepository.All
                    .Where(c => c.ReferenceNumber == purchaseOrderExit.OrderNumber)
                        .Include(c => c.TransactionItems).ThenInclude(c => c.TransactionItemTaxes)
                        .Include(c => c.PaymentEntries)
                        .Include(c => c.TaxEntries)
                        .Include(c => c.AccountingEntries).FirstOrDefaultAsync();

                    if (transaction != null)
                    {
                        _transactionItemRepository.RemoveRange(transaction.TransactionItems);
                        _paymentEntryRepository.RemoveRange(transaction.PaymentEntries);
                        _taxEntryRepository.RemoveRange(transaction.TaxEntries);
                        _accountingEntryRepository.RemoveRange(transaction.AccountingEntries);

                        //remove inventory
                        transaction.TransactionType = TransactionType.PurchaseReturn;
                        _transactionRepository.Remove(transaction);
                        await _inventoryService.ProcessInventoryChangesAsync(transaction);
                    }
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while removing purchase order Accounting");
            }

            try
            {
                if (!purchaseOrderExit.IsPurchaseOrderRequest && (purchaseOrderExit.TotalAmount != request.TotalAmount || purchaseOrderExit.TotalTax != request.TotalTax || purchaseOrderExit.TotalDiscount != request.TotalDiscount))
                {
                    // Accounting Entries
                    if (purchaseOrderExit.TotalAmount != request.TotalAmount || purchaseOrderExit.TotalTax != request.TotalTax || purchaseOrderExit.TotalDiscount != request.TotalDiscount)
                    {
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
                            BranchId = purchaseOrderExit.LocationId,
                            Narration = "Purchase order",
                            ReferenceNumber = purchaseOrderExit.OrderNumber,
                            TransactionDate = DateTime.UtcNow,
                            TransactionType = TransactionType.Purchase,
                            Items = transactionItems
                        };
                        await _accountingService.ProcessTransactionAsync(transactionDto);
                    }
                }

            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Purchase order accounting");
            }
            _purchaseOrderItemRepository.RemoveRange(purchaseOrderItemsExist);

            var purchaseOrderUpdate = _mapper.Map<POS.Data.PurchaseOrder>(request);
            purchaseOrderExit.OrderNumber = purchaseOrderUpdate.OrderNumber;
            purchaseOrderExit.SupplierId = purchaseOrderUpdate.SupplierId;
            purchaseOrderExit.Note = purchaseOrderUpdate.Note;
            purchaseOrderExit.TermAndCondition = purchaseOrderUpdate.TermAndCondition;
            purchaseOrderExit.IsPurchaseOrderRequest = purchaseOrderUpdate.IsPurchaseOrderRequest;
            purchaseOrderExit.POCreatedDate = purchaseOrderUpdate.POCreatedDate;
            purchaseOrderExit.Status = purchaseOrderUpdate.Status;
            purchaseOrderExit.DeliveryDate = purchaseOrderUpdate.DeliveryDate;
            purchaseOrderExit.DeliveryStatus = purchaseOrderUpdate.DeliveryStatus;
            purchaseOrderExit.SupplierId = purchaseOrderUpdate.SupplierId;
            purchaseOrderExit.TotalAmount = purchaseOrderUpdate.TotalAmount;
            purchaseOrderExit.TotalTax = purchaseOrderUpdate.TotalTax;
            purchaseOrderExit.TotalDiscount = purchaseOrderUpdate.TotalDiscount;
            purchaseOrderExit.PurchaseOrderItems = purchaseOrderUpdate.PurchaseOrderItems;
            purchaseOrderExit.TotalRoundOff = purchaseOrderUpdate.TotalRoundOff;
            purchaseOrderExit.PurchaseOrderItems.ForEach(c =>
            {
                c.PurchaseOrderId = purchaseOrderUpdate.Id;
            });
            purchaseOrderExit.PurchaseOrderItems.ForEach(item =>
            {
                item.Product = null;
                item.PurchaseOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
            });
            if (request.TotalAmount == 0)
            {
                purchaseOrderExit.PaymentStatus = PaymentStatus.Paid;
            }
            _purchaseOrderRepository.Update(purchaseOrderExit);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while creating Purchase Order.");
                return ServiceResponse<PurchaseOrderDto>.Return500();
            }
            var dto = _mapper.Map<PurchaseOrderDto>(purchaseOrderExit);
            return ServiceResponse<PurchaseOrderDto>.ReturnResultWith201(dto);
        }
    }
}
