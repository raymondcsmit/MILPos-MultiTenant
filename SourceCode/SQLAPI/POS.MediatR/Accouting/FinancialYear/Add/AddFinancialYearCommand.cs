using System;
using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;

namespace POS.MediatR.Accouting
{
    public class AddFinancialYearCommand : IRequest<ServiceResponse<FinancialYearDto>>
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime? CloseDate { get; set; }
        public bool IsClosed { get; set; }
    }
}
