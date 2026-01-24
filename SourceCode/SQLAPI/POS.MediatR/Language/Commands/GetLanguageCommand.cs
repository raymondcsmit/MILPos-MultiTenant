using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Language.Commands
{
    public class GetLanguageCommand : IRequest<ServiceResponse<LanguageDto>>
    {
        public Guid Id { get; set; }
    }
}
