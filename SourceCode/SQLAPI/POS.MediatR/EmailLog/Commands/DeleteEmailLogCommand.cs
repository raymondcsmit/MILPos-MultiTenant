using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.EmailLog.Commands
{
    public class DeleteEmailLogCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}