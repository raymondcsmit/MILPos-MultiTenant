using MediatR;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetProductStockCountCommand : IRequest<ServiceResponse<int>>
    {
        public Guid ProductId { get; set; }
        public Guid LocationId { get; set; }
    }
}
