using System;
using MediatR;
using POS.Helper;

namespace POS.MediatR.Location.Commands
{
    public class DeleteLocationCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}
