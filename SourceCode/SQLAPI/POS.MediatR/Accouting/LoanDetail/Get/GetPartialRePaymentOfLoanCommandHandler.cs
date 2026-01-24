using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
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
    public class GetPartialRePaymentOfLoanCommandHandler(
        ILoanRepaymentRepository _loanRepaymentRepository,
        ILogger<GetPartialRePaymentOfLoanCommandHandler> _logger) : IRequestHandler<GetPartialRePaymentOfLoanCommand, ServiceResponse<List<LoanRepaymentDto>>>
    {
        public async Task<ServiceResponse<List<LoanRepaymentDto>>> Handle(GetPartialRePaymentOfLoanCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var Payments = await _loanRepaymentRepository.All.Where(c => c.LoanDetailId == request.Id).Include(c => c.LoanDetail).ToListAsync();

                var paymentdtos = Payments.Select(c => new LoanRepaymentDto
                {
                    Id = c.Id,
                    InterestAmount = c.InterestAmount,
                    Note = c.Note,
                    LoanDetailId = c.LoanDetailId,
                    PrincipalAmount = c.PricipalAmount,
                    PaymentDate = c.PaymentDate,
                    LenderName = c.LoanDetail != null ? c.LoanDetail.LenderName : "",
                }).ToList();

                return ServiceResponse<List<LoanRepaymentDto>>.ReturnResultWith200(paymentdtos);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting loan details");
                return ServiceResponse<List<LoanRepaymentDto>>.Return500("error while getting loan details");
            }
        }
    }
}
