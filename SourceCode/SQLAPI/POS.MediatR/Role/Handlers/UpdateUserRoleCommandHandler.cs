using Amazon.Runtime.Internal.Util;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class UpdateUserRoleCommandHandler : IRequestHandler<UpdateUserRoleCommand, ServiceResponse<UserRoleDto>>
    {
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly IConnectionMappingRepository _connectionMappingRepository;
        private readonly IHubContext<UserHub, IHubClient> _hubContext;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<UpdateUserRoleCommand> _logger;
        public UpdateUserRoleCommandHandler(IUserRoleRepository userRoleRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            IConnectionMappingRepository connectionMappingRepository,
            IHubContext<UserHub, IHubClient> hubContext,
            IUserRepository userRepository,
            ILogger<UpdateUserRoleCommand> logger)
        {
            _userRoleRepository = userRoleRepository;
            _uow = uow;
            _mapper = mapper;
            _connectionMappingRepository = connectionMappingRepository;
            _hubContext = hubContext;
            _userRepository = userRepository;
            _logger = logger;
        }
        public async Task<ServiceResponse<UserRoleDto>> Handle(UpdateUserRoleCommand request, CancellationToken cancellationToken)
        {
            var userRoles = await _userRoleRepository.All.Where(c => c.RoleId == request.Id).ToListAsync();
            var userRolesToAdd = request.UserRoles.Where(c => !userRoles.Select(c => c.UserId).Contains(c.UserId.Value)).ToList();
            bool isPermissionChange = false;
            if (userRolesToAdd.Count > 0)
            {
                _userRoleRepository.AddRange(_mapper.Map<List<UserRole>>(userRolesToAdd));
                isPermissionChange = true;
            }

            var userRolesToDelete = userRoles.Where(c => !request.UserRoles.Select(cs => cs.UserId).Contains(c.UserId)).ToList();
            if (userRolesToDelete.Count > 0)
            {
                _userRoleRepository.RemoveRange(userRolesToDelete);
                isPermissionChange = true;
            }
            // send notification permission change
            if (isPermissionChange)
            {
                try
                {
                    var allOnlineUsers = _connectionMappingRepository.GetAllUsers().ToList();
                    var addUserIds = allOnlineUsers.Where(c => userRolesToAdd.Select(c => c.UserId).Contains(c.Id)).Select(c => c.Id).ToList();
                    var deleteUserId = allOnlineUsers.Where(c => userRolesToDelete.Select(c => c.UserId).Contains(c.Id)).Select(c => c.Id).ToList(); ;
                    var finalUserIds = addUserIds.Union(deleteUserId).ToList();

                    var userIds = await _userRepository.All.Where(c => (finalUserIds.Contains(c.Id)))
                        .Select(cs => cs.Id).ToListAsync(cancellationToken);
                    foreach (var userId in userIds)
                    {
                        var onlineUser = allOnlineUsers.FirstOrDefault(u => u.Id == userId);
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

            }


            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<UserRoleDto>.Return500();
            }
            return ServiceResponse<UserRoleDto>.ReturnSuccess();
        }
    }

}
