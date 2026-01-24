using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.PageHelper.Commands
{
    public class GetPageHelperCommand : IRequest<ServiceResponse<PageHelperDto>>
    {
        public Guid Id { get; set; }
    }
}
