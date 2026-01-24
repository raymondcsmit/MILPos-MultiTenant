using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, ServiceResponse<UserDto>>
    {
        private readonly UserManager<User> _userManager;
        private readonly UserInfoToken _userInfoToken;
        private readonly IMapper _mapper;
        private readonly ILogger<DeleteUserCommandHandler> _logger;
        private readonly IConnectionMappingRepository _connectionMappingRepository;
        private readonly IHubContext<UserHub, IHubClient> _hubContext;

        public DeleteUserCommandHandler(
            UserManager<User> userManager,
            IMapper mapper,
            UserInfoToken userInfoToken,
            ILogger<DeleteUserCommandHandler> logger,
            IConnectionMappingRepository connectionMappingRepository,
            IHubContext<UserHub, IHubClient> hubContext)
        {
            _userManager = userManager;
            _mapper = mapper;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _connectionMappingRepository = connectionMappingRepository;
            _hubContext = hubContext;
        }

        public async Task<ServiceResponse<UserDto>> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            var appUser = await _userManager.FindByIdAsync(request.Id.ToString());
            if (appUser == null)
            {
                _logger.LogError("User does not exist.");
                return ServiceResponse<UserDto>.Return409("User does not exist.");
            }
            appUser.IsDeleted = true;
            appUser.DeletedDate = DateTime.UtcNow;
            appUser.DeletedBy = _userInfoToken.Id;
            IdentityResult result = await _userManager.UpdateAsync(appUser);
            if (!result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500();
            }
            // send notification permission change
            var onlineUser = _connectionMappingRepository.GetUserInfoById(appUser.Id);
            if (onlineUser != null)
            {
                await _hubContext.Clients.Client(onlineUser.ConnectionId).OnUserPermissionChange(onlineUser.Id);
            }

            return ServiceResponse<UserDto>.ReturnResultWith200(_mapper.Map<UserDto>(appUser));
        }
    }
}
