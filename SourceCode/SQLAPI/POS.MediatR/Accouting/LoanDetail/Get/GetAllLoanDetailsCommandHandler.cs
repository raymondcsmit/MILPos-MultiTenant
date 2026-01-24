using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetAllLoanDetailsCommandHandler(
        ILoanDetailRepository _loanDetailRepository,
        ILogger<GetAllLoanDetailsCommandHandler> _logger) : IRequestHandler<GetAllLoanDetailsCommand, ServiceResponse<List<LoanDetailDto>>>
    {
        public async Task<ServiceResponse<List<LoanDetailDto>>> Handle(GetAllLoanDetailsCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var loans = await _loanDetailRepository.All.
                                   Include(c => c.LoanAccount)
                                   .Include(c => c.LoanAccountInterestExpense)
                                   .Include(c => c.LoanRepayments)
                                   .Include(c => c.Branch).ToListAsync();
                var loanDtos = loans.Select(c => new LoanDetailDto
                {
                    Id = c.Id,
                    BranchId = c.BranchId,
                    BranchName = c.Branch?.Name,
                    LenderName = c.LenderName,
                    LoanAccountId = c.LoanAccountId,
                    AccountName = c.LoanAccount?.AccountName,
                    LoanAccountInterestExpenseId = c.LoanAccountInterestExpenseId,
                    LoanAccountInterestExpenseName = c.LoanAccountInterestExpense?.AccountName,
                    LoanAmount = c.LoanAmount,
                    LoanDate = c.LoanDate,
                    Narration = c.Narration,
                    LoanNumber = c.LoanNumber,
                    TotalPaidInterestAmount = c.LoanRepayments.Sum(c => c.InterestAmount),
                    TotalPaidPricipalAmount= c.LoanRepayments.Sum(c => c.PricipalAmount)
                }).ToList();

                return ServiceResponse<List<LoanDetailDto>>.ReturnResultWith200(loanDtos);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting loan details");
                return ServiceResponse<List<LoanDetailDto>>.Return500("error while getting loan details");
            }
        }
    }
}
