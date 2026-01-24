using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Helper;
using POS.Repository;

namespace POS.MediatR
{
    public class GetSalesOrderOverdueByCustomerIdCommandHandler(
        ICustomerLedgerRepository _customerLedgerRepository,
        ISalesOrderRepository _salesOrderRepository) : IRequestHandler<GetSalesOrderOverdueByCustomerIdCommand, ServiceResponse<SaleOrderDepositDto>>
    {
        public async Task<ServiceResponse<SaleOrderDepositDto>> Handle(GetSalesOrderOverdueByCustomerIdCommand request, CancellationToken cancellationToken)
        {
            var overdue = await _salesOrderRepository.All
        .Where(s => s.CustomerId == request.CustomerId && !s.IsSalesOrderRequest &&
                    (s.PaymentStatus == PaymentStatus.Pending || s.PaymentStatus == PaymentStatus.Partial))
        .SumAsync(s => s.TotalAmount - s.TotalPaidAmount);
            var balance = await _customerLedgerRepository.All.Where(s => s.CustomerId == request.CustomerId)
                .OrderByDescending(c => c.ModifiedDate)
                .FirstOrDefaultAsync();
            var dto = new SaleOrderDepositDto
            {
                Overdue = overdue,
                Balance = balance?.Balance ?? 0.00m,
            };
            return ServiceResponse<SaleOrderDepositDto>.ReturnResultWith200(dto);
        }
    }
}
