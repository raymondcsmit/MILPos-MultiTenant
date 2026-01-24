using Amazon.Runtime.Internal.Util;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetDailyPaymentBreakdownReportCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        ILogger<GetDailyPaymentBreakdownReportCommandHandler> _logger ,
        UserInfoToken userInfoToken,
        IUserRepository _userRepository,
        IUserLocationsRepository _userLocationsRepository) : IRequestHandler<GetDailyPaymentBreakdownReportCommand, ServiceResponse<DailyPaymentBreakdownDto>>
    {
        public async Task<ServiceResponse<DailyPaymentBreakdownDto>> Handle(GetDailyPaymentBreakdownReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var utcDate = request.DailyReportDate.ToUniversalTime();

                DateTime minDate = utcDate;
                DateTime maxDate = utcDate.AddDays(1).AddTicks(-1);
                var accountingQuery = _accountingEntryRepository.All;

                var user = await _userRepository.All.Where(c => c.Id == userInfoToken.Id).FirstOrDefaultAsync();
                if (user != null && !user.IsAllLocations)
                {
                    var userLocationIds = await _userLocationsRepository.All.Where(c => c.UserId == user.Id).Select(c => c.LocationId).ToListAsync();
                    accountingQuery = accountingQuery.Where(c => userLocationIds.Contains(c.BranchId));
                }
                var ledgerAccounts = await _ledgerAccountRepository.All.Where(c => c.AccountCode == "1050" || c.AccountCode == "1060").Select(c => new
                {
                   c.Id,
                   c.AccountCode
                }).ToListAsync();

               var cashAccountId = ledgerAccounts.Where(c => c.AccountCode == "1050").Select(c=>c.Id).FirstOrDefault();
                var bankAccountId = ledgerAccounts.Where(c => c.AccountCode == "1060").Select(c => c.Id).FirstOrDefault();

                var totalsEntries = await accountingQuery
                   .Where(c => (
                   c.DebitLedgerAccountId == cashAccountId ||
                   c.DebitLedgerAccountId == bankAccountId ||
                   c.CreditLedgerAccountId == cashAccountId ||
                   c.CreditLedgerAccountId == bankAccountId
                   && c.EntryDate >= minDate && c.EntryDate <= maxDate))
                   .Select(c => new
                   {
                       c.DebitLedgerAccountId,
                       c.CreditLedgerAccountId,
                       c.Amount
                   })
                   .ToListAsync();

                var cashReceivedtotal = totalsEntries.Where(c => c.DebitLedgerAccountId == cashAccountId).Sum(c => c.Amount);
                var bankReceivedTotal = totalsEntries.Where(c => c.DebitLedgerAccountId == bankAccountId).Sum(c => c.Amount);

                var cashGiventotal = totalsEntries.Where(c => c.CreditLedgerAccountId == cashAccountId).Sum(c => c.Amount);
                var bankGivenTotal = totalsEntries.Where(c => c.CreditLedgerAccountId == bankAccountId).Sum(c => c.Amount);

                var paymentDto = new DailyPaymentBreakdownDto
                {
                    CashReceived = cashReceivedtotal,
                    BankReceived = bankReceivedTotal,
                    TotalCollected = cashReceivedtotal + bankReceivedTotal,
                    CashGiven = cashGiventotal,
                    BankGiven = bankGivenTotal,
                    TotalGiven = cashGiventotal + bankGivenTotal,
                };
                return ServiceResponse<DailyPaymentBreakdownDto>.ReturnResultWith200(paymentDto);
            }
            catch(System.Exception ex)
            {
                _logger.LogError(ex, "error while geting dailyPayment report");
                return ServiceResponse<DailyPaymentBreakdownDto>.Return500("error while geting dailyPayment report");
            }
        }
    }
}
