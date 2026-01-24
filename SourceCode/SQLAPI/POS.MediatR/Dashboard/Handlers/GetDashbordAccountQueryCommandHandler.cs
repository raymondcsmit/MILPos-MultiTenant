using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Helper;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetDashbordAccountQueryCommandHandler(
        ITransactionRepository _transactionRepository) : IRequestHandler<GetDashbordAccountQueryCommand, DashboardStatics>
    {
        public async Task<DashboardStatics> Handle(GetDashbordAccountQueryCommand request, CancellationToken cancellationToken)
        {
            var fromDate = request.FromDate;
            var toDate = request.ToDate.AddDays(1);
            var transactionQuery = _transactionRepository.All
                .Where(c=>c.TransactionDate >= fromDate && c.TransactionDate < toDate 
                        && c.TransactionType == TransactionType.Purchase
                        || c.TransactionType == TransactionType.PurchaseReturn
                        || c.TransactionType == TransactionType.Sale
                        || c.TransactionType == TransactionType.SaleReturn);
            if (request.LocationId.HasValue)
            {
                transactionQuery = transactionQuery.Where(c => c.BranchId == request.LocationId.Value);
            }
            var transactions = await transactionQuery.ToListAsync();
            var purchaseTotal = transactions 
                .Where(c => c.TransactionType == TransactionType.Purchase )
                .Sum(c => c.TotalAmount);
            var purchaseReturnTotal = transactions
                .Where(c => c.TransactionType == TransactionType.PurchaseReturn && !c.Narration.ToUpper().Contains("PAYMENT"))
                .Sum(c => c.TotalAmount);
            var salesTotal = transactions
                .Where(c => c.TransactionType == TransactionType.Sale )
                .Sum(c => c.TotalAmount);
            var salesReturnTotal = transactions
                .Where(c => c.TransactionType == TransactionType.SaleReturn && !c.Narration.ToUpper().Contains("PAYMENT"))
                .Sum(c => c.TotalAmount);

            var dashboardStatics = new DashboardStatics
            {
                TotalPurchase = purchaseTotal,
                TotalPurchaseReturn = purchaseReturnTotal,
                TotalSalesReturn = salesReturnTotal,
                TotalSales = salesTotal,
            };
            return dashboardStatics;
        }
    }
}
