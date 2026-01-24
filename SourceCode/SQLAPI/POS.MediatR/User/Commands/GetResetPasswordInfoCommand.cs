using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR
{
    public class GetResetPasswordInfoCommand : IRequest<ServiceResponse<UserDto>>
    {
        public string Token { get; set; }
    }
}
