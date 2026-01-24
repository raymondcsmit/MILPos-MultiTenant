using MediatR;
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
    public class GetAllCustomerLedgerCommandHandler(
        ICustomerLedgerRepository _customerLedgerRepository) : IRequestHandler<GetAllCustomerLedgerCommand, CustomerLedgerList>
    {
        public async Task<CustomerLedgerList> Handle(GetAllCustomerLedgerCommand request, CancellationToken cancellationToken)
        {
            return await _customerLedgerRepository.GetAllCustomerLedger(request.CustomerLedgerResource);
        }
    }
}
