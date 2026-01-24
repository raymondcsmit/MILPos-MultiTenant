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
    public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand, ServiceResponse<RoleDto>>
    {
        private readonly IRoleRepository _roleRepository;
        private readonly IRoleClaimRepository _roleClaimRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly UserInfoToken _userInfoToken;
        private readonly ILogger<UpdateRoleCommandHandler> _logger; 
        private readonly IConnectionMappingRepository _connectionMappingRepository;
        private readonly IHubContext<UserHub, IHubClient> _hubContext;
        private readonly IUserRepository _userRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        public UpdateRoleCommandHandler(
           IRoleRepository roleRepository,
           IRoleClaimRepository roleClaimRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            UserInfoToken userInfoToken,
            ILogger<UpdateRoleCommandHandler> logger,
             IConnectionMappingRepository connectionMappingRepository,
            IHubContext<UserHub, IHubClient> hubContext,
            IUserRepository userRepository,
            IUserRoleRepository userRoleRepository
            )
        {
            _roleRepository = roleRepository;
            _roleClaimRepository = roleClaimRepository;
            _mapper = mapper;
            _uow = uow;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _connectionMappingRepository = connectionMappingRepository;
            _hubContext = hubContext;
            _userRepository = userRepository;
            _userRoleRepository = userRoleRepository;
        }

        public async Task<ServiceResponse<RoleDto>> Handle(UpdateRoleCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _roleRepository.FindBy(c => c.Name == request.Name && c.Id != request.Id)
                 .FirstOrDefaultAsync();

            if (entityExist != null)
            {
                _logger.LogError("Role Name Already Exist.");
                return ServiceResponse<RoleDto>.Return409("Role Name Already Exist.");
            }

            // Update Role
            entityExist = await _roleRepository.FindByInclude(v => v.Id == request.Id, c => c.RoleClaims).FirstOrDefaultAsync();

            if (entityExist.IsSuperRole)
            {
                _logger.LogError("Super admin Role can not be updated.");
                return ServiceResponse<RoleDto>.Return409("Super admin Role can not be updated.");
            }

            entityExist.Name = request.Name;
            entityExist.ModifiedBy = _userInfoToken.Id;
            entityExist.ModifiedDate = DateTime.UtcNow;
            entityExist.NormalizedName = request.Name;
            _roleRepository.Update(entityExist);
            bool isPermissionChange = false;
            // update Role Claim
            var roleClaims = entityExist.RoleClaims.ToList();
            var roleClaimsToAdd = request.RoleClaims.Where(c => !roleClaims.Select(c => c.Id).Contains(c.Id)).ToList();
            if(roleClaimsToAdd.Count > 0)
            {
                _roleClaimRepository.AddRange(_mapper.Map<List<RoleClaim>>(roleClaimsToAdd));
                isPermissionChange = true;
            }
            var roleClaimsToDelete = roleClaims.Where(c => !request.RoleClaims.Select(cs => cs.Id).Contains(c.Id)).ToList();
            if(roleClaimsToDelete.Count > 0)
            {
                _roleClaimRepository.RemoveRange(roleClaimsToDelete);
                isPermissionChange = true;
            }
            // send notification permission change
            if (isPermissionChange)
            {
                try
                {
                    var allOnlineUsers = _connectionMappingRepository.GetAllUsers().ToList();
                    var roleUserIds = await _userRoleRepository.All.Where(c => c.RoleId == request.Id).Select(c => c.UserId).ToListAsync();
                    var finalUserIds = allOnlineUsers.Where(c => roleUserIds.Contains(c.Id)).Select(c => c.Id);

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
                catch(System.Exception ex)
                {
                    _logger.LogError(ex, "Error sending permission change notification to online users.");
                }
               
            }

            // TODO: update user Role
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<RoleDto>.Return500();
            }
            return ServiceResponse<RoleDto>.ReturnResultWith200(_mapper.Map<RoleDto>(entityExist));
        }
    }
}
