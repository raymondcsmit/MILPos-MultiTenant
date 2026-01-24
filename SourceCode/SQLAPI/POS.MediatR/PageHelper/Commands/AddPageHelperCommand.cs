using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.PageHelper.Commands
{
    public class AddPageHelperCommand : IRequest<ServiceResponse<PageHelperDto>>
    {
        public string Name { get; set; }
        public string Description { get; set; }

    }
}
