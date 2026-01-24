using System.Collections.Generic;
using MediatR;
using POS.Data.Dto;

namespace POS.MediatR.Location.Commands
{
    public class GetAllLocationCommand : IRequest<List<LocationDto>>
    {
    }
}