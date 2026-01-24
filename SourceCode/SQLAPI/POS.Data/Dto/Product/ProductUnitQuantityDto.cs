using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto
{
    public class ProductUnitQuantityDto
    {
        public Guid ProductId { get; set; }
        public Guid UnitId { get; set; }
        public decimal? Stock { get; set; }
        public string Name { get; set; }
    }
}
