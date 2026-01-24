using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Strategies;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting;
public class AddPartialRePaymentOfLoanCommand : IRequest<ServiceResponse<bool>>
{
    public Guid LoanDetailId { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string Note { get; set; }
}

public class AddPartialRePaymentOfLoanCommandHandler(
    IUnitOfWork<POSDbContext> _uow,
    ILoanDetailRepository loanDetailRepository,
    ILogger<AddLoanDetailCommandHandler> _logger,
    ITransactionRepository transactionRepository,
    IFinancialYearRepository financialYearRepository,
    ILoanStrategy loanStrategy,
    ILoanRepaymentRepository loanRepaymentRepository
    ) : IRequestHandler<AddPartialRePaymentOfLoanCommand, ServiceResponse<bool>>
{
    public async Task<ServiceResponse<bool>> Handle(AddPartialRePaymentOfLoanCommand request, CancellationToken cancellationToken)
    {
        var loanDetail = loanDetailRepository.All.Where(c => c.Id == request.LoanDetailId).FirstOrDefault();
        if (loanDetail == null)
        {
            return ServiceResponse<bool>.Return404("Loan Detail is not found.");
        }

        var currentYear = await financialYearRepository.All.Where(c => !c.IsClosed).FirstOrDefaultAsync();
        if (currentYear == null)
        {
            return ServiceResponse<bool>.Return404("year not found");
        }
        var loanRepayment = new LoanRepayment
        {
            Id = Guid.NewGuid(),
            LoanDetailId = request.LoanDetailId,
            PaymentDate = request.PaymentDate,
            InterestAmount = request.InterestAmount,
            PricipalAmount = request.PrincipalAmount,
            Note = request.Note
        };
        loanRepaymentRepository.Add(loanRepayment);
        // Loan Repayment Account
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            BranchId = loanDetail.BranchId,
            Narration = "Loan Repayment ::" + loanDetail.Narration,
            ReferenceNumber = loanRepayment.Id.ToString(),
            TransactionDate = DateTime.UtcNow,
            TransactionType = TransactionType.LoanRepayment,
            TotalAmount = request.PrincipalAmount + request.InterestAmount,
            FinancialYearId = currentYear.Id,
            TransactionNumber = await transactionRepository.GenerateTransactionNumberAsync(TransactionType.LoanRepayment)
        };
        transaction.Status = TransactionStatus.Completed;
        transactionRepository.Add(transaction);

        await loanStrategy.ProcessPaymentOfLoanAsync(loanDetail, transaction, loanRepayment);

        if (await _uow.SaveAsync() <= 0)
        {
            _logger.LogError("Save Loan Repayment have Error");
            return ServiceResponse<bool>.Return500();
        }
        return ServiceResponse<bool>.ReturnResultWith200(true);
    }
}

