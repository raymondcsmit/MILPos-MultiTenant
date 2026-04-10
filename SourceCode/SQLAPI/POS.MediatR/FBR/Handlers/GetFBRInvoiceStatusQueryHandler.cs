using MediatR;
using POS.Helper;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;
using POS.MediatR.FBR.Queries;

namespace POS.MediatR.FBR.Handlers
{
    public class GetFBRInvoiceStatusQueryHandler : IRequestHandler<GetFBRInvoiceStatusQuery, ServiceResponse<object>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;

        public GetFBRInvoiceStatusQueryHandler(ISalesOrderRepository salesOrderRepository)
        {
            _salesOrderRepository = salesOrderRepository;
        }

        public async Task<ServiceResponse<object>> Handle(GetFBRInvoiceStatusQuery request, CancellationToken cancellationToken)
        {
            var salesOrder = await _salesOrderRepository.FindAsync(request.SalesOrderId);
            if (salesOrder == null)
            {
                return ServiceResponse<object>.Return404("Sales order not found.");
            }

            var result = new
            {
                fbrStatus = salesOrder.FBRStatus.ToString(),
                fbrInvoiceNumber = salesOrder.FBRInvoiceNumber,
                fbrUSIN = salesOrder.FBRUSIN,
                submittedAt = salesOrder.FBRSubmittedAt,
                acknowledgedAt = salesOrder.FBRAcknowledgedAt,
                retryCount = salesOrder.FBRRetryCount,
                errorMessage = salesOrder.FBRErrorMessage
            };

            return ServiceResponse<object>.ReturnResultWith200(result);
        }
    }
}
