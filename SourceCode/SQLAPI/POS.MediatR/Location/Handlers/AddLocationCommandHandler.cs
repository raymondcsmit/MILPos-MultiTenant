using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration.UserSecrets;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Language.Commands;
using POS.MediatR.Location.Commands;
using POS.Repository;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Location.Handlers
{
    public class AddLocationCommandHandler(
        ILocationRepository _locationRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<AddLocationCommand> _logger,
        IMapper _mapper,
        IUserRepository userRepository,
        UserInfoToken userInfoToken,
        IConnectionMappingRepository connectionMappingRepository,
        IHubContext<UserHub, IHubClient> _hubContext) : IRequestHandler<AddLocationCommand, ServiceResponse<LocationDto>>
    {
        public async Task<ServiceResponse<LocationDto>> Handle(AddLocationCommand request, CancellationToken cancellationToken)
        {
            var existingEntity = await _locationRepository.FindBy(c => c.Name == request.Name).FirstOrDefaultAsync();
            if (existingEntity != null)
            {
                _logger.LogError("Location Already Exist");
                return ServiceResponse<LocationDto>.Return409("Location Already Exist.");
            }
            var entity = _mapper.Map<POS.Data.Entities.Location>(request);
            _locationRepository.Add(entity);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Save Page have Error");
                return ServiceResponse<LocationDto>.Return500();
            }
            var entityToReturn = _mapper.Map<LocationDto>(entity);
            // send notification permission change
            try
            {
                var allUsers = connectionMappingRepository.GetAllUsers().ToList();
                var userIds = await userRepository.All.Where(c => (allUsers.Select(c => c.Id).Contains(c.Id) && c.IsAllLocations))
                    .Select(cs => cs.Id).ToListAsync(cancellationToken);
                if (userInfoToken != null)
                {
                    userIds.Add(userInfoToken.Id);
                }

                foreach (var userId in userIds.Distinct())
                {
                    var onlineUser = allUsers.FirstOrDefault(u => u.Id == userId);
                    if (onlineUser != null)
                    {
                        await _hubContext.Clients.Client(onlineUser.ConnectionId)
                            .OnUserPermissionChange(userId);
                    }
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error sending permission change notification to online users.");
            }


            return ServiceResponse<LocationDto>.ReturnResultWith200(entityToReturn);
        }
    }
}
