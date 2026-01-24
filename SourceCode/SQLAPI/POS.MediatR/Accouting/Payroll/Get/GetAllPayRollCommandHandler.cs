using MediatR;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetAllPayRollCommandHandler(
        IPayrollRepository _payrollRepository) : IRequestHandler<GetAllPayRollCommand, PayrollList>
    {
        public async Task<PayrollList> Handle(GetAllPayRollCommand request, CancellationToken cancellationToken)
        {
            return await _payrollRepository.GetPayrolls(request.PayrollResource);
        }
    }
}
