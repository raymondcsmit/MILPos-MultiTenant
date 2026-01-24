using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Location.Commands
{
    public class GetLocationCommand : IRequest<ServiceResponse<LocationDto>>
    {
        public Guid Id { get; set; }
    }
}
