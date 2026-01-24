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
    public class GetPurchaseOrdersTotalCommand : IRequest<PurchaseSalesTotalDto>
    {
        public PurchaseOrderResource PurchaseOrderResource { get; set; }
    }
}
