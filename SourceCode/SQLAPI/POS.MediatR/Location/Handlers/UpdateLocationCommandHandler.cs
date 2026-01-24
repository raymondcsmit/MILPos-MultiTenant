using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Location.Commands;
using POS.Repository;

namespace POS.MediatR.Location.Handlers
{
    public class UpdateLocationCommandHandler (IUnitOfWork<POSDbContext> _uow, ILocationRepository _locationRepository,IMapper _mapper,ILogger<UpdateLocationCommand> _logger): IRequestHandler<UpdateLocationCommand, ServiceResponse<LocationDto>>
    {
        public async Task<ServiceResponse<LocationDto>> Handle(UpdateLocationCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _locationRepository.FindBy(c => c.Name == request.Name && c.Id != request.Id)
             .FirstOrDefaultAsync();
            if (entityExist != null)
            {
                _logger.LogError("Data Already Exist.");
                return ServiceResponse<LocationDto>.Return409("Data Already Exist.");
            }
            entityExist = await _locationRepository.FindBy(v => v.Id == request.Id).FirstOrDefaultAsync();
            entityExist.Name = request.Name;
            entityExist.Id = request.Id;
            entityExist.Address = request.Address;
            entityExist.Email = request.Email;
            entityExist.Mobile = request.Mobile;
            entityExist.ContactPerson = request.ContactPerson;
            entityExist.Website = request.Website;
            _locationRepository.Update(entityExist);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<LocationDto>.Return500();
            }
            var result = _mapper.Map<LocationDto>(entityExist);
            return ServiceResponse<LocationDto>.ReturnResultWith200(result);
        }
    }
}
