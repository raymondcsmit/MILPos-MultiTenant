using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ServiceResponse<UserDto>>
    {
        private readonly UserManager<User> _userManager;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly UserInfoToken _userInfoToken;
        private readonly ILogger<UpdateUserCommandHandler> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        private readonly IUserLocationsRepository _userLocationsRepository;
        private readonly IConnectionMappingRepository _connectionMappingRepository;
        private readonly IHubContext<UserHub, IHubClient> _hubContext;

        public UpdateUserCommandHandler(
            IUserRoleRepository userRoleRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            UserManager<User> userManager,
            UserInfoToken userInfoToken,
            ILogger<UpdateUserCommandHandler> logger,
            IWebHostEnvironment webHostEnvironment,
            PathHelper pathHelper,
            IUserLocationsRepository userLocationsRepository,
            IConnectionMappingRepository connectionMappingRepository,
            IHubContext<UserHub, IHubClient> hubContext)
        {
            _mapper = mapper;
            _userManager = userManager;
            _userRoleRepository = userRoleRepository;
            _uow = uow;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _userLocationsRepository = userLocationsRepository;
            _connectionMappingRepository = connectionMappingRepository;
            _hubContext = hubContext;
        }

        public async Task<ServiceResponse<UserDto>> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var appUser = await _userManager.FindByIdAsync(request.Id.ToString());
            if (appUser == null)
            {
                _logger.LogError("User does not exist.");
                return ServiceResponse<UserDto>.Return409("User does not exist.");
            }
            appUser.FirstName = request.FirstName;
            appUser.LastName = request.LastName;
            appUser.PhoneNumber = request.PhoneNumber;
            appUser.Address = request.Address;
            appUser.IsActive = request.IsActive;
            appUser.ModifiedDate = DateTime.UtcNow;
            appUser.ModifiedBy = _userInfoToken.Id;
            appUser.IsAllLocations = request.IsAllLocations;

            var oldProfilePhoto = appUser.ProfilePhoto;
            if (request.IsImageUpdate)
            {
                if (!string.IsNullOrEmpty(request.ImgSrc))
                {
                    appUser.ProfilePhoto = $"{Guid.NewGuid()}.png";
                }
                else
                {
                    appUser.ProfilePhoto = null;
                }
            }

            IdentityResult result = await _userManager.UpdateAsync(appUser);
            bool isPermissionChange = false;
            // Update User's Role
            var userRoles = _userRoleRepository.All.Where(c => c.UserId == appUser.Id).ToList();
            var rolesToAdd = request.RoleIds.Where(c => !userRoles.Select(c => c.RoleId).Contains(c)).Select(c => new UserRole
            {
                RoleId = c,
                UserId = appUser.Id
            }).ToList();

            if (rolesToAdd.Count > 0)
            {
                _userRoleRepository.AddRange(rolesToAdd);
                isPermissionChange = true;
            }

            var rolesToDelete = userRoles.Where(c => !request.RoleIds.Contains(c.RoleId)).ToList();
            _userRoleRepository.RemoveRange(rolesToDelete);
            if (rolesToDelete.Count > 0)
            {
                _userRoleRepository.AddRange(rolesToAdd);
                isPermissionChange = true;
            }

            // Update User's Locations
            var userLocations = _userLocationsRepository.All.Where(c => c.UserId == appUser.Id).ToList();
            if (userLocations.Count > 0)
            {
                _userLocationsRepository.RemoveRange(userLocations);
                isPermissionChange = true;
            }

            if (request.Locations.Count > 0)
            {
                var userLocationsToAdd = request.Locations.Select(c => new UserLocation
                {
                    LocationId = c,
                    UserId = appUser.Id
                }).ToList();
                _userLocationsRepository.AddRange(userLocationsToAdd);
                isPermissionChange = true;
            }
            // send notification permission change
            if (isPermissionChange)
            {
                try
                {
                    var onlineUser = _connectionMappingRepository.GetUserInfoById(appUser.Id);
                    if (onlineUser != null)
                    {
                        await _hubContext.Clients.Client(onlineUser.ConnectionId).OnUserPermissionChange(onlineUser.Id);
                    }
                }
                catch (System.Exception ex)
                {
                    _logger.LogError(ex, "Error sending permission change notification to online users.");
                }

            }
            if (await _uow.SaveAsync() <= 0 && !result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500();
            }

            if (request.IsImageUpdate)
            {

                var pathToSave = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.UserProfilePath);
                if (!Directory.Exists(pathToSave))
                {
                    Directory.CreateDirectory(pathToSave);
                }

                // delete old file
                if (!string.IsNullOrWhiteSpace(oldProfilePhoto))
                {
                    var oldFile = Path.Combine(pathToSave, oldProfilePhoto);
                    if (File.Exists(oldFile))
                    {
                        FileData.DeleteFile(oldFile);
                    }
                }
                // save new file
                if (!string.IsNullOrWhiteSpace(request.ImgSrc))
                {
                    var filePath = Path.Combine(pathToSave, appUser.ProfilePhoto);
                    await FileData.SaveFile(filePath, request.ImgSrc);
                }
            }

            return ServiceResponse<UserDto>.ReturnResultWith200(_mapper.Map<UserDto>(appUser));
        }
    }
}
