using AutoMapper;
using MediatR;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Helper;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetCustomerLedgerCommandHandler(
         ICustomerLedgerRepository customerLedgerRepository,
         IMapper mapper,
         ILogger<GetCustomerLedgerCommandHandler> _logger) : IRequestHandler<GetCustomerLedgerCommand, ServiceResponse<CustomerLedgerDto>>
    {
        public async Task<ServiceResponse<CustomerLedgerDto>> Handle(GetCustomerLedgerCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var entity = await customerLedgerRepository.FindAsync(request.Id);
                if (entity == null)
                {

                    return ServiceResponse<CustomerLedgerDto>.Return404("Customer Ledger not found");
                }
                return ServiceResponse<CustomerLedgerDto>.ReturnResultWith200(mapper.Map<CustomerLedgerDto>(entity));
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while geting Customerledger");
                return ServiceResponse<CustomerLedgerDto>.Return500("error while geting Customerledger");
            }

        }
    }
}
