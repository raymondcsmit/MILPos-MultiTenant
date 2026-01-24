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
    public class GetDailyPurchaseReportCommand:IRequest<ServiceResponse<DailyPurchaseReportDto>>
    {
        public required string TimeZone { get; set; }
        public required DateTime DailyReportDate { get; set; }
    } 
}
