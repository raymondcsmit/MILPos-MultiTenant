using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class GetNewPurchaseOrderNumberQueryHandler
        : IRequestHandler<GetNewPurchaseOrderNumberQuery, string>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;

        public GetNewPurchaseOrderNumberQueryHandler(IPurchaseOrderRepository purchaseOrderRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
        }
        public async Task<string> Handle(GetNewPurchaseOrderNumberQuery request, CancellationToken cancellationToken)
        {
            var lastPurchaseOrder = await _purchaseOrderRepository.All.Where(c=> c.IsPurchaseOrderRequest != request.isPurchaseOrder)
                .OrderByDescending(c => c.CreatedDate).FirstOrDefaultAsync();
            if (lastPurchaseOrder == null)
            {
                if (request.isPurchaseOrder)
                {
                    return "PO#00001";
                }
                else
                {
                    return "POR#00001";
                }
            }

            var lastPONumber = lastPurchaseOrder.OrderNumber;
            var match = Regex.Match(lastPONumber, @"^(.*?)(\d+)$");
            if (match.Success && int.TryParse(match.Groups[2].Value, out int poNumber))
            {
                var prefix = match.Groups[1].Value;
                var digitsLength = match.Groups[2].Value.Length;
                var nextNumber = poNumber + 1;
                return $"{prefix}{nextNumber.ToString().PadLeft(digitsLength, '0')}";
            }
            else
            {
                return $"{lastPONumber}#00001";
            }
        }
    }
}
