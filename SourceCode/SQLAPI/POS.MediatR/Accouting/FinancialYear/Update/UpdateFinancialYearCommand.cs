using System;
using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;

namespace POS.MediatR.Accouting
{
    public class UpdateFinancialYearCommand : IRequest<ServiceResponse<FinancialYearDto>>
    {
        public Guid Id { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        //public DateTime? ClosedDate { get; set; }
    }
}
