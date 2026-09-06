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
            var match = Regex.Match(lastSoNumber, @"^(.*?)(\d+)$");
            if (match.Success && int.TryParse(match.Groups[2].Value, out int soNumber))
            {
                var prefix = match.Groups[1].Value;
                var digitsLength = match.Groups[2].Value.Length;
                var nextNumber = soNumber + 1;
                return $"{prefix}{nextNumber.ToString().PadLeft(digitsLength, '0')}";
            }
            else
            {
                return $"{lastSoNumber}#00001";
            }
          
        }
    }
}
