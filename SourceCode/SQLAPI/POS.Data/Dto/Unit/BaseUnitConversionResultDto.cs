using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Unit
{
    public class BaseUnitConversionResultDto
    {
        public decimal BaseQuantity { get; set; }
        public decimal BaseUnitPrice { get; set; }
        public Guid UnitId { get; set; }
    }
}
