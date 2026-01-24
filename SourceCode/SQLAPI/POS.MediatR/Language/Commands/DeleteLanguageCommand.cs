using System;
using MediatR;
using POS.Helper;

namespace POS.MediatR.Language.Commands
{
    public class DeleteLanguageCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}
