using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Domain;
using POS.Repository.Accouting;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository;
public class PaymentEntryRepository(
    IUnitOfWork<POSDbContext> uow,
    IPropertyMappingService _propertyMappingService) : GenericRepository<PaymentEntry, POSDbContext>(uow),  IPaymentEntryRepository
{

    public  Task<PaymentEntryList> GetAllPaymentEntries(PaymentEntryResource paymentEntryResource)
    {
        var collectionBeforePaging = AllIncluding(c => c.Branch, c => c.Transaction).ApplySort(paymentEntryResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<PaymentEntryDto, PaymentEntry>());

        if (!string.IsNullOrWhiteSpace(paymentEntryResource.TransactionNumber))
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => c.Transaction.TransactionNumber.Contains(paymentEntryResource.TransactionNumber));
        }
        if (paymentEntryResource.FinancialYearId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.Transaction.FinancialYearId == paymentEntryResource.FinancialYearId.Value);
        }
        if (paymentEntryResource.BranchId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.BranchId == paymentEntryResource.BranchId.Value);
        }
        if (paymentEntryResource.PaymentFromDate.HasValue && paymentEntryResource.PaymentToDate.HasValue)
        {
            var startDate = paymentEntryResource.PaymentFromDate.Value.ToLocalTime();
            var endDate = paymentEntryResource.PaymentToDate.Value.ToLocalTime();

            DateTime minDate = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0);
            DateTime maxDate = new DateTime(endDate.Year, endDate.Month, endDate.Day, 23, 59, 59);

            collectionBeforePaging = collectionBeforePaging
                        .Where(c => c.PaymentDate >= minDate &&
                            c.PaymentDate <= maxDate);
        }
        if (paymentEntryResource.Amount.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => c.Amount==paymentEntryResource.Amount);
        }

        var paymentEntry = new PaymentEntryList();
        return paymentEntry.Create(
              collectionBeforePaging,
              paymentEntryResource.Skip,
              paymentEntryResource.PageSize);
    }

}



