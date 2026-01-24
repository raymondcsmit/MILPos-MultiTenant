using MediatR;
using POS.Data.Dto;
using System.Collections.Generic;

namespace POS.MediatR.Language.Commands
{
    public class GetAllLanguageCommand : IRequest<List<LanguageDto>>
    {
    }
}
