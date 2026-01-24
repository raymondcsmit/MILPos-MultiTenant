using MediatR;
using POS.Data;
using POS.Data.Resources;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetAllProductStockCommand : IRequest<ProductStockList>
    {
        public ProductStockResource ProductStockResource { get; set; }
    }
}
