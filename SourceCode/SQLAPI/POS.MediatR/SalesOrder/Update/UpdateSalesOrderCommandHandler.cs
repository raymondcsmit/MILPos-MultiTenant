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
    public class UpdateSalesOrderCommandHandler
        : IRequestHandler<UpdateSalesOrderCommand, ServiceResponse<SalesOrderDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdateSalesOrderCommandHandler> _logger;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ITransactionItemRepository _transactionItemRepository;
        private readonly IPaymentEntryRepository _paymentEntryRepository;
        private readonly ITaxEntryRepository _taxEntryRepository;
        private readonly IAccountingService _accountingService;
        private readonly IInventoryService _inventoryService;
        private readonly IAccountingEntryRepository _accountingEntryRepository;
        private readonly ITaxRepository _taxRepository;
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly IProductStockRepository _productStockRepository;


        public UpdateSalesOrderCommandHandler(
            ISalesOrderRepository salesOrderRepository,
            ISalesOrderItemRepository salesOrderItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdateSalesOrderCommandHandler> logger,
            ITransactionRepository transactionRepository,
            ITransactionItemRepository transactionItemRepository,
            IPaymentEntryRepository paymentEntryRepository,
            ITaxEntryRepository taxEntryRepository,
            IAccountingService accountingService,
            IInventoryService inventoryService,
            IAccountingEntryRepository accountingEntryRepository,
             ITaxRepository taxRepository,
             IUnitConversationRepository unitConversationRepository,
             IProductStockRepository productStockRepository)
        {
            _salesOrderRepository = salesOrderRepository;
            _salesOrderItemRepository = salesOrderItemRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _transactionRepository = transactionRepository;
            _transactionItemRepository = transactionItemRepository;
            _paymentEntryRepository = paymentEntryRepository;
            _taxEntryRepository = taxEntryRepository;
            _accountingService = accountingService;
            _inventoryService = inventoryService;
            _accountingEntryRepository = accountingEntryRepository;
            _taxRepository = taxRepository;
            _unitConversationRepository = unitConversationRepository;
            _productStockRepository = productStockRepository;

        }

        public async Task<ServiceResponse<SalesOrderDto>> Handle(UpdateSalesOrderCommand request, CancellationToken cancellationToken)
        {
            var existingSONumber = _salesOrderRepository.All.Any(c => c.OrderNumber == request.OrderNumber && c.Id != request.Id);
            if (existingSONumber)
            {
                return ServiceResponse<SalesOrderDto>.Return409("Sales Order Number is already Exists.");
            }

            var salesOrderExit = await _salesOrderRepository.FindAsync(request.Id);
            if (salesOrderExit.Status == SalesOrderStatus.Return)
            {
                return ServiceResponse<SalesOrderDto>.Return409("Sales Order can't edit becuase it's already Return.");
            }
            if (!salesOrderExit.IsSalesOrderRequest && salesOrderExit.DeliveryStatus == SalesDeliveryStatus.DELIVERED)
            {
                return ServiceResponse<SalesOrderDto>.Return409("Sales Order can't edit becuase it's already received.");
            }

            if (salesOrderExit.PaymentStatus == PaymentStatus.Partial || salesOrderExit.PaymentStatus == PaymentStatus.Paid)
            {
                return ServiceResponse<SalesOrderDto>.Return409("Sales Order can't edit becuase it's payment already received.");
            }
            
            var salesOrderItemsExist = await _salesOrderItemRepository.FindBy(c => c.SalesOrderId == request.Id).ToListAsync();

            try
            {
                if (!salesOrderExit.IsSalesOrderRequest && (salesOrderExit.TotalAmount != request.TotalAmount || salesOrderExit.TotalTax != request.TotalTax || salesOrderExit.TotalDiscount != request.TotalDiscount))
                {
                    //Remove accounting
                    var transaction = await _transactionRepository.All
                        .Where(c => c.ReferenceNumber == salesOrderExit.OrderNumber)
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
                        transaction.TransactionType = TransactionType.SaleReturn;
                        _transactionRepository.Remove(transaction);
                        await _inventoryService.ProcessInventoryChangesAsync(transaction);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "errow while removing accounting");
            }
            try
            {
                if (!salesOrderExit.IsSalesOrderRequest && (salesOrderExit.TotalAmount != request.TotalAmount || salesOrderExit.TotalTax != request.TotalTax || salesOrderExit.TotalDiscount != request.TotalDiscount))
                {
                    // Accounting Entries
                    var transactionItems = new List<TransactionItemDto>();
                    var taxEntities = await _taxRepository.All.Select(c => new TaxDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Percentage = c.Percentage,

                    }).ToListAsync();
                    foreach (var item in request.SalesOrderItems)
                    {
                        var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);
                        decimal totalTaxPercentage = 0.00m;
                        // Check if item has any taxes
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
                        BranchId = salesOrderExit.LocationId,
                        Narration = "sales order",
                        ReferenceNumber = salesOrderExit.OrderNumber,
                        TransactionDate = DateTime.UtcNow,
                        TransactionType = TransactionType.Sale,
                        Items = transactionItems,
                        FlatDiscount = request.FlatDiscount,
                        RoundOffAmount = request.TotalRoundOff
                    };
                    await _accountingService.ProcessTransactionAsync(transactionDto);
                }

            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Purchase order accounting");
            }

            _salesOrderItemRepository.RemoveRange(salesOrderItemsExist);
            var salesOrderUpdate = _mapper.Map<POS.Data.SalesOrder>(request);
            salesOrderUpdate.SalesOrderItems.ForEach(item =>
            {
                item.Product = null;
                item.SalesOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
            });

            salesOrderExit.OrderNumber = salesOrderUpdate.OrderNumber;
            salesOrderExit.CustomerId = salesOrderUpdate.CustomerId;
            salesOrderExit.Note = salesOrderUpdate.Note;
            salesOrderExit.TermAndCondition = salesOrderUpdate.TermAndCondition;
            salesOrderExit.IsSalesOrderRequest = salesOrderUpdate.IsSalesOrderRequest;
            salesOrderExit.SOCreatedDate = salesOrderUpdate.SOCreatedDate;
            salesOrderExit.Status = salesOrderUpdate.Status;
            salesOrderExit.DeliveryDate = salesOrderUpdate.DeliveryDate;
            salesOrderExit.DeliveryStatus = salesOrderUpdate.DeliveryStatus;
            salesOrderExit.CustomerId = salesOrderUpdate.CustomerId;
            salesOrderExit.TotalAmount = salesOrderUpdate.TotalAmount;
            salesOrderExit.TotalTax = salesOrderUpdate.TotalTax;
            salesOrderExit.TotalDiscount = salesOrderUpdate.TotalDiscount;
            salesOrderExit.FlatDiscount = salesOrderUpdate.FlatDiscount;
            salesOrderExit.SalesOrderItems = salesOrderUpdate.SalesOrderItems;
            salesOrderExit.TotalRoundOff = salesOrderUpdate.TotalRoundOff;
            salesOrderExit.SalesOrderItems.ForEach(c =>
            {
                c.SalesOrderId = salesOrderUpdate.Id;
                c.SalesOrderItemTaxes.ForEach(tax => { tax.Tax = null; });
                c.CreatedDate = DateTime.UtcNow;
            });
            if (request.TotalAmount == 0)
            {
                salesOrderExit.PaymentStatus = PaymentStatus.Paid;
            }
            _salesOrderRepository.Update(salesOrderExit);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while Updating Sales Order.");
                return ServiceResponse<SalesOrderDto>.Return500();
            }

            var dto = _mapper.Map<SalesOrderDto>(salesOrderExit);
            return ServiceResponse<SalesOrderDto>.ReturnResultWith201(dto);
        }
    }
}
