using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class GroupedAccountDto
    {
        public Guid AccountId { get; set; }
        public string Type { get; set; }
        public decimal Amount { get; set; }

    }
}
