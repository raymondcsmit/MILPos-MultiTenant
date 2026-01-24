using System.Collections.Generic;
using MediatR;
using POS.Data.Dto;

namespace POS.MediatR.PageHelper.Commands
{
    public class GetAllPageHelpersCommand : IRequest<List<PageHelperDto>>
    {
    }
}
