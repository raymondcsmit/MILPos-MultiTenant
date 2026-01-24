using System;
using MediatR;
using POS.Helper;

namespace POS.MediatR.PageHelper.Commands
{
    public class DeletePageHelperCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}
