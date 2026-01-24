using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR
{
    public class ForgetPasswordCommand : IRequest<ServiceResponse<bool>>
    {
        [Required]
        public string Email { get; set; }
        [Required]
        public string UserName { get; set; }
        [Required]
        public string HostUrl { get; set; }
    }
}
