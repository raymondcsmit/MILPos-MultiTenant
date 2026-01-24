using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.MediatR.Location.Commands;
using POS.Repository;

namespace POS.MediatR.Location.Handlers
{
    public class GetAllLocationCommandHandler(ILocationRepository _locationRepository) : IRequestHandler<GetAllLocationCommand, List<LocationDto>>
    {
        public async Task<List<LocationDto>> Handle(GetAllLocationCommand request, CancellationToken cancellationToken)
        {
            var entities = await _locationRepository.All
                .Select(c => new LocationDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    Email = c.Email,
                    Mobile = c.Mobile,
                    ContactPerson = c.ContactPerson,
                    Website = c.Website,
                }).ToListAsync();
            return entities;
        }
    }
}
