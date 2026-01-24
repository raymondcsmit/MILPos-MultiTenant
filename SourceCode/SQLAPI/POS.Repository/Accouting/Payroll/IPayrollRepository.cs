using POS.Common.GenericRepository;
using POS.Data.Entities;
using POS.Data.Resources;
using System.Threading.Tasks;

namespace POS.Repository.Accouting;
public interface IPayrollRepository : IGenericRepository<Payroll>
{
    Task<PayrollList> GetPayrolls(PayrollResource payrollResource);
}
