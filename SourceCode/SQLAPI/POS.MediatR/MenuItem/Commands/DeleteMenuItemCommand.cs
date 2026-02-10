using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.MenuItem.Commands
{
    public class DeleteMenuItemCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}
