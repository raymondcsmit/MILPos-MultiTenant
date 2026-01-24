using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.Location.Commands;
using POS.Repository;

namespace POS.MediatR.Location.Handlers
{
    public class GetLocationCommandHandler (ILocationRepository _locationRepository,IMapper _mapper,ILogger<GetLocationCommand> _logger): IRequestHandler<GetLocationCommand, ServiceResponse<LocationDto>>
    {
        public async Task<ServiceResponse<LocationDto>> Handle(GetLocationCommand request, CancellationToken cancellationToken)
        {
            var entity = await _locationRepository.FindBy(c => c.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("Data is not exists");
                return ServiceResponse<LocationDto>.Return404();
            }
            var entityDto = _mapper.Map<LocationDto>(entity);
            return ServiceResponse<LocationDto>.ReturnResultWith200(entityDto);
        }
    }
}
