using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.Runtime.Internal;
using MediatR;
using POS.Helper;

namespace POS.MediatR
{
    public class RecoverPasswordCommand : IRequest<ServiceResponse<bool>>
    {
        public string UserName { get; set; }
        public string Password { get; set; }
        public string Token { get; set; }
    }
}
