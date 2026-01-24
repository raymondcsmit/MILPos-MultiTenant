using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class DeleteVariantCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}
