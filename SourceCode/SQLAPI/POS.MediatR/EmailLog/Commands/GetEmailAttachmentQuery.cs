using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;

namespace POS.MediatR.CommandAndQuery
{
    public class GetEmailAttachmentQuery : IRequest<ServiceResponse<EmailLogAttachmentDto>>
    {
        public Guid Id { get; set; }
    }
}
