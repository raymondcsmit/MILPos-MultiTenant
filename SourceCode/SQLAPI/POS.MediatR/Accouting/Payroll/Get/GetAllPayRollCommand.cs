using MediatR;
using POS.Data.Resources;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetAllPayRollCommand:IRequest<PayrollList>
    {
        public PayrollResource PayrollResource {  get; set; }
    }
}
