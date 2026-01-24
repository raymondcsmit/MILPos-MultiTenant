using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class GetNewSalesOrderNumberQueryHandler : IRequestHandler<GetNewSalesOrderNumberCommand, string>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;

        public GetNewSalesOrderNumberQueryHandler(ISalesOrderRepository salesOrderRepository)
        {
            _salesOrderRepository = salesOrderRepository;
        }
        public async Task<string> Handle(GetNewSalesOrderNumberCommand request, CancellationToken cancellationToken)
        {
            var lastSalesOrder = await _salesOrderRepository.All.Where(c=>c.IsSalesOrderRequest == request.IsSalesOrderRequest).OrderByDescending(c => c.CreatedDate).FirstOrDefaultAsync();

            if (lastSalesOrder == null)
            {
                if (!request.IsSalesOrderRequest)
                {
                    return "SO#00001";
                }
                else
                {
                    return "SOR#00001";
                }
            }

            var lastSoNumber = lastSalesOrder.OrderNumber;
            var soId = Regex.Match(lastSoNumber, @"\d+").Value;
            var isNumber = int.TryParse(soId, out int soNumber);
            if (isNumber)
            {
                var newPoId = lastSoNumber.Replace(soNumber.ToString(), "");
                return $"{newPoId}{soNumber + 1}";
            }
            else
            {
                return $"{lastSoNumber}#00001";
            }
          
        }
    }
}
