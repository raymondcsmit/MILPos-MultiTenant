using POS.Common.GenericRepository;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Repository.Accouting;
using System.Threading.Tasks;

namespace POS.Repository;
public interface IPaymentEntryRepository : IGenericRepository<PaymentEntry>
{
    Task<PaymentEntryList> GetAllPaymentEntries(PaymentEntryResource paymentEntryResource);
}
