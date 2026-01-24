using Amazon.Runtime.Internal.Util;
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
using POS.MediatR.Commands;
using POS.Repository;
using POS.Repository.Accouting;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class DeleteStockTransferCommandHandler(IStockTransferRepository _stockTransferRepository,
        IUnitOfWork<POSDbContext> _uow,
        ITransactionRepository _transactionRepository,
        IAccountingEntryRepository _accountingEntryRepository,
        IPaymentEntryRepository _paymentEntryRepository,
        ITransactionItemRepository _transactionItemRepository,
        ITaxEntryRepository _taxEntryRepository,
        IInventoryService _inventoryService,
        ILogger<DeleteStockTransferCommandHandler> _logger)
        : IRequestHandler<DeleteStockTransferCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(DeleteStockTransferCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var entityExist = await _stockTransferRepository
                .AllIncluding(c => c.StockTransferItems)
                .FirstOrDefaultAsync(d => d.Id == request.Id);

                if (entityExist == null)
                {
                    return ServiceResponse<bool>.Return404();
                }

                _stockTransferRepository.Delete(request.Id);

                if (entityExist.Status == Data.Enums.StockTransferStatus.Delivered)
                {
                    var transactions = await _transactionRepository.All
                        .Where(c => c.ReferenceNumber == entityExist.ReferenceNo)
                            .Include(c => c.TransactionItems).ThenInclude(c=>c.TransactionItemTaxes)
                            .Include(c => c.PaymentEntries)
                            .Include(c => c.TaxEntries)
                            .Include(c => c.AccountingEntries).ToListAsync();
                    if (transactions.Count > 0)
                    {
                        foreach (var item in transactions)
                        {
                            if (item.TransactionType == TransactionType.StockTransferFromBranch)
                            {
                                _transactionItemRepository.RemoveRange(item.TransactionItems);
                                _paymentEntryRepository.RemoveRange(item.PaymentEntries);
                                _taxEntryRepository.RemoveRange(item.TaxEntries);
                                _accountingEntryRepository.RemoveRange(item.AccountingEntries);

                                //inventory Add From Branch 
                                item.TransactionType = TransactionType.StockTransferToBranch;
                                _transactionRepository.Delete(item);

                                await _inventoryService.ProcessInventoryChangesAsync(item);
                            }
                            else
                            {
                                _transactionItemRepository.RemoveRange(item.TransactionItems);
                                _paymentEntryRepository.RemoveRange(item.PaymentEntries);
                                _taxEntryRepository.RemoveRange(item.TaxEntries);
                                _accountingEntryRepository.RemoveRange(item.AccountingEntries);

                                //inventory remove To Branch 
                                item.TransactionType = TransactionType.StockTransferFromBranch;
                                _transactionRepository.Delete(item);

                                await _inventoryService.ProcessInventoryChangesAsync(item);
                            }
                        }
                    }
                }
                return ServiceResponse<bool>.ReturnResultWith200(true);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while Deleting damage stock");
                return ServiceResponse<bool>.Return500("error while Deleting damage stock");
            }
            
        }
    }
}
