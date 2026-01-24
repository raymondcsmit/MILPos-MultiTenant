using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class AddOpeningBalanceCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid AccountId { get; set; }
        public Guid LocationId { get; set; }
        public Guid FinancialYearId { get; set; }
        public decimal OpeningBalance { get; set; }
        public OpeningBalanceType Type { get; set; }
    }
    public enum OpeningBalanceType
    {
        Credit = 1,
        Debit = 2
    }
}
