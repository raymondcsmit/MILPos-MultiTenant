using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.Runtime.Internal;
using MediatR;
using POS.Data.Dto;

namespace POS.MediatR
{
    public class GetPurchaseOrderTaxItemCommand : IRequest<List<PurchaseOrderItemTaxDto>>
    {
        public Guid Id { get; set; }
    }
}
