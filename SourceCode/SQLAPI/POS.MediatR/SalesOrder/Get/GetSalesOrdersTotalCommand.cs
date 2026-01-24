using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto.PurchaseOrder;
using POS.Data.Resources;

namespace POS.MediatR
{
    public class GetSalesOrdersTotalCommand : IRequest<PurchaseSalesTotalDto>
    {
        public SalesOrderResource SalesOrderResource { get; set; }
    }
}
