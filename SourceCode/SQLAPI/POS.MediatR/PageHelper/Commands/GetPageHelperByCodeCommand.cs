using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.PageHelper.Commands
{
    public class GetPageHelperByCodeCommand : IRequest<ServiceResponse<PageHelperDto>>
    {
        public string Code { get; set; }
    }
}
