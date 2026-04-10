using MediatR;
using POS.Helper;
using POS.Repository;
using POS.Domain.FBR;
using POS.Domain.FBR.DTOs;
using System;
using System.Threading;
using System.Threading.Tasks;
using POS.MediatR.FBR.Commands;

namespace POS.MediatR.FBR.Handlers
{
    public class SubmitFBRInvoiceCommandHandler : IRequestHandler<SubmitFBRInvoiceCommand, ServiceResponse<FBRInvoiceResponse>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IFBRInvoiceService _fbrService;

        public SubmitFBRInvoiceCommandHandler(
            ISalesOrderRepository salesOrderRepository,
            IFBRInvoiceService fbrService)
        {
            _salesOrderRepository = salesOrderRepository;
            _fbrService = fbrService;
        }

        public async Task<ServiceResponse<FBRInvoiceResponse>> Handle(SubmitFBRInvoiceCommand request, CancellationToken cancellationToken)
        {
            var salesOrder = await _salesOrderRepository.FindAsync(request.SalesOrderId);
            if (salesOrder == null)
            {
                return ServiceResponse<FBRInvoiceResponse>.Return404("Sales order not found.");
            }

            try
            {
                var response = await _fbrService.SubmitInvoiceAsync(salesOrder);
                return ServiceResponse<FBRInvoiceResponse>.ReturnResultWith200(response);
            }
            catch (Exception ex)
            {
                return ServiceResponse<FBRInvoiceResponse>.Return500(ex.Message);
            }
        }
    }
}
