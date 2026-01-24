using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.Runtime.Internal;
using MediatR;
using POS.Helper;

namespace POS.MediatR.Email.Commands
{
    public class SendSalesOrPurchaseCommand : IRequest<ServiceResponse<bool>>
    {
        public string Attachement { get; set; }
        public string FileType { get; set; }
        public string Message { get; set; }
        public string Subject { get; set; }
        public string ToAddress { get; set; }
        public string Name { get; set; }
    }
}
