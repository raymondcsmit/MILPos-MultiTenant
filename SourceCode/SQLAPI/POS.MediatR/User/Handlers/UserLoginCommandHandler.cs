using POS.Data;
using POS.Data.Dto;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.AspNetCore.Identity;
using System.Threading;
using System.Threading.Tasks;
using POS.Helper;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Hosting;
using POS.Common.Services;
using System.IO;
using AutoMapper;
using System.Collections.Generic;
using System;

namespace POS.MediatR.Handlers
{
    public class UserLoginCommandHandler : IRequestHandler<UserLoginCommand, ServiceResponse<UserAuthDto>>
    {
        private readonly IUserRepository _userRepository;
        private readonly SignInManager<User> _signInManager;
        private readonly UserManager<User> _userManager;
        private readonly ILoginAuditRepository _loginAuditRepository;
        private readonly IHubContext<UserHub, IHubClient> _hubContext;
        private readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly IFileStorageService _fileStorageService;
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IMapper _mapper;

        public UserLoginCommandHandler(
            IUserRepository userRepository,
            SignInManager<User> signInManager,
            UserManager<User> userManager,
            ILoginAuditRepository loginAuditRepository,
            IHubContext<UserHub, IHubClient> hubContext,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment,
            IFileStorageService fileStorageService,
            IMenuItemRepository menuItemRepository,
            IUserRoleRepository userRoleRepository,
            IMapper mapper
            )
        {
            _userRepository = userRepository;
            _signInManager = signInManager;
            _userManager = userManager;
            _loginAuditRepository = loginAuditRepository;
            _hubContext = hubContext;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
            _fileStorageService = fileStorageService;
            _menuItemRepository = menuItemRepository;
            _userRoleRepository = userRoleRepository;
            _mapper = mapper;
        }
        public async Task<ServiceResponse<UserAuthDto>> Handle(UserLoginCommand request, CancellationToken cancellationToken)
        {
            var loginAudit = new LoginAuditDto
            {
                UserName = request.UserName,
                RemoteIP = request.RemoteIp,
                Status = LoginStatus.Error.ToString(),
                Latitude = request.Latitude,
                Longitude = request.Longitude
            };

            var requestUserName = request.UserName.ToUpper();
            var user = await _userManager.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.NormalizedUserName == requestUserName, cancellationToken);
            
            if (user == null)
            {
                 user = await _userManager.Users.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.NormalizedEmail == requestUserName, cancellationToken);
            }
            if(user == null)
            {
                await _loginAuditRepository.LoginAudit(loginAudit);
                return ServiceResponse<UserAuthDto>.ReturnFailed(401, "UserName Or Password is InCorrect.");
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
            
            if (result.Succeeded)
            {
                var userInfo = await _userRepository
                    .All
                    .IgnoreQueryFilters()
                    .Where(c => c.UserName == request.UserName || c.Email== request.UserName)
                    .FirstOrDefaultAsync();
                if (!userInfo.IsActive)
                {
                    await _loginAuditRepository.LoginAudit(loginAudit);
                    return ServiceResponse<UserAuthDto>.ReturnFailed(401, "UserName Or Password is InCorrect.");
                }

                loginAudit.Status = LoginStatus.Success.ToString();
                await _loginAuditRepository.LoginAudit(loginAudit);
                var authUser = await _userRepository.BuildUserAuthObject(userInfo);
                var onlineUser = new SignlarUser
                {
                    Email = authUser.Email,
                    Id = authUser.Id
                };
                await _hubContext.Clients.All.Joined(onlineUser);
                if (!string.IsNullOrWhiteSpace(authUser.ProfilePhoto))
                {
                    var physicalPath = _fileStorageService.GetPhysicalPath(Path.Combine(_pathHelper.UserProfilePath, authUser.ProfilePhoto));
                    if (File.Exists(physicalPath))
                    {
                        authUser.ProfilePhoto = Path.Combine(_pathHelper.UserProfilePath, authUser.ProfilePhoto).Replace("\\", "/");
                    }
                    else
                    {
                        authUser.ProfilePhoto = null;
                    }
                }

                // Load Menus
                var userRoles = await _userRoleRepository.FindBy(ur => ur.UserId == authUser.Id).ToListAsync();
                var roleIds = userRoles.Select(ur => ur.RoleId).ToList();

                var menuItemsQuery = _menuItemRepository.AllIncluding(c => c.RoleMenuItems)
                    .Where(c => c.IsActive);

                if (authUser.IsSuperAdmin)
                {
                    // For superadmin, filter by TargetTenantId if it exists to avoid duplicates
                    // Or if menu items are tenant-specific, ensure we get the right ones
                    // Assuming MenuItem has TenantId, we might want to filter by null (global) or specific tenant
                    // Based on the user's issue, duplicates suggest we are getting both global and tenant specific or similar
                    
                    // If the User object has a TenantId, we should use it.
                    // However, authUser is UserAuthDto, let's check the userInfo entity loaded earlier
                    
                    if (userInfo.TenantId != Guid.Empty)
                    {
                         menuItemsQuery = menuItemsQuery.Where(c => c.TenantId == userInfo.TenantId || c.TenantId == null);
                    }
                }

                var allMenuItems = await menuItemsQuery
                    .OrderBy(c => c.Order)
                    .ToListAsync();

                var menuItems = _menuItemRepository.ProcessMenuDeduplication(allMenuItems);

                var dtos = _mapper.Map<List<MenuItemDto>>(menuItems);

                foreach (var dto in dtos)
                {
                    var entity = menuItems.FirstOrDefault(m => m.Id == dto.Id);
                    if (entity != null && entity.RoleMenuItems != null)
                    {
                        var permissions = entity.RoleMenuItems
                            .Where(rm => roleIds.Contains(rm.RoleId))
                            .ToList();

                        dto.CanView = permissions.Any(p => p.CanView);
                        dto.CanCreate = permissions.Any(p => p.CanCreate);
                        dto.CanEdit = permissions.Any(p => p.CanEdit);
                        dto.CanDelete = permissions.Any(p => p.CanDelete);
                    }
                }

                authUser.Menus = BuildTree(dtos);

                return ServiceResponse<UserAuthDto>.ReturnResultWith200(authUser);
            }
            else
            {
                await _loginAuditRepository.LoginAudit(loginAudit);
                return ServiceResponse<UserAuthDto>.ReturnFailed(401, "UserName Or Password is InCorrect.");
            }
        }

        private List<MenuItemDto> BuildTree(List<MenuItemDto> items)
        {
            var dict = items.ToDictionary(i => i.Id);
            var rootItems = new List<MenuItemDto>();

            foreach (var item in items)
            {
                if (item.ParentId.HasValue && dict.ContainsKey(item.ParentId.Value))
                {
                    dict[item.ParentId.Value].Children.Add(item);
                }
                else
                {
                    rootItems.Add(item);
                }
            }
            return rootItems;
        }
    }
}
