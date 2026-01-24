using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.PageHelper.Commands
{
    public class UpdatePageHelperCommand : IRequest<ServiceResponse<PageHelperDto>>
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }
}
