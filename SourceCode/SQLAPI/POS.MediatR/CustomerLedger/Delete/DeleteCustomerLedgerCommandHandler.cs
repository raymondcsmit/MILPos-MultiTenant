using Amazon.Runtime.Internal.Util;
using MediatR;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Domain;
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
    public class DeleteCustomerLedgerCommandHandler(
        ICustomerLedgerRepository _customerLedgerRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<DeleteCustomerLedgerCommandHandler> _logger) : IRequestHandler<DeleteCustomerLedgerCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(DeleteCustomerLedgerCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var entityExist = await _customerLedgerRepository.FindAsync(request.Id);
                if (entityExist == null)
                {
                    _logger.LogError("Customer Ledger Does not exists");
                    return ServiceResponse<bool>.Return404("Customer Ledger  Does not exists");
                }

                _customerLedgerRepository.Delete(entityExist);
                if (await _uow.SaveAsync() <= 0)
                {
                    _logger.LogError("Error While deleting Customer ledger.");
                    return ServiceResponse<bool>.Return500();
                }
                return ServiceResponse<bool>.ReturnSuccess();
            }
            catch(System.Exception ex) 
            {
                _logger.LogError(ex,"error while deleting customer Ledger");
                return ServiceResponse<bool>.Return500("error while deleting customer Ledger");
            
            }
        }
    }
}
