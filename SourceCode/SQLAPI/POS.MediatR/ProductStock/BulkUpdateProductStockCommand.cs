using MediatR;
using POS.Helper;
using System.Collections.Generic;

namespace POS.MediatR
{
    public class BulkUpdateProductStockCommand : IRequest<ServiceResponse<bool>>
    {
        public List<AddProductStockCommand> StockUpdates { get; set; } = new List<AddProductStockCommand>();
    }
}
