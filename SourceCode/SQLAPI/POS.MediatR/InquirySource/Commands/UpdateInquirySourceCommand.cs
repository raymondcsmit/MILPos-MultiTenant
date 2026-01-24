using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.CommandAndQuery
{
    public class UpdateInquirySourceCommand : IRequest<ServiceResponse<InquirySourceDto>>
    {
        public string Name { get; set; }
        public Guid Id { get; set; }
    }
}
