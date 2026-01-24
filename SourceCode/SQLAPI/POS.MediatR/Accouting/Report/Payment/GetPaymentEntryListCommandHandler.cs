using MediatR;
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
    public class GetPaymentEntryListCommandHandler(
        IPaymentEntryRepository paymentEntryRepository) : IRequestHandler<GetPaymentEntryListCommand, PaymentEntryList>
    {
        public async Task<PaymentEntryList> Handle(GetPaymentEntryListCommand request, CancellationToken cancellationToken)
        {
            return await paymentEntryRepository.GetAllPaymentEntries(request.paymentEntryResource);
        }
    }
}
