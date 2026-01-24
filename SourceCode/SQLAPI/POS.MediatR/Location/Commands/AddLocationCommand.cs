using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Location.Commands
{
    public class AddLocationCommand : IRequest<ServiceResponse<LocationDto>>
    {
        public string Name { get; set; }
        public string Address { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string ContactPerson { get; set; }
        public string Website { get; set; }
    }
}
