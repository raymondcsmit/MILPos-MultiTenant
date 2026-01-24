using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Helper;

namespace POS.MediatR
{
    public class MarkParchaseOrderAsReceivedCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}
