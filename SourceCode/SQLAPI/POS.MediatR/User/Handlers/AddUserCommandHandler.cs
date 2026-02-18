using AutoMapper;
using POS.Data;
using POS.Data.Dto;
using POS.MediatR.CommandAndQuery;
using MediatR;
using Microsoft.AspNetCore.Identity;
using System;
using System.Threading;
using System.Threading.Tasks;
using POS.Helper;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using POS.Repository;
using POS.Data.Entities;
using System.Linq;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Common.Services;
using POS.Common;

namespace POS.MediatR.Handlers
{
    public class AddUserCommandHandler : IRequestHandler<AddUserCommand, ServiceResponse<UserDto>>
    {
        private readonly UserManager<User> _userManager;
        private readonly UserInfoToken _userInfoToken;
        private readonly IMapper _mapper;
        private readonly ILogger<AddUserCommandHandler> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        private readonly IUserLocationsRepository _userLocationsRepository;
        IUnitOfWork<POSDbContext> _uow; // Can be removed eventually if using strictly UserManager, but needed for Locations
        private readonly IFileStorageService _fileStorageService;
        private readonly RoleManager<Role> _roleManager; // Inject RoleManager

        public AddUserCommandHandler(
            IMapper mapper,
            UserManager<User> userManager,
            RoleManager<Role> roleManager, // Add RoleManager
            UserInfoToken userInfoToken,
            ILogger<AddUserCommandHandler> logger,
            IWebHostEnvironment webHostEnvironment,

            PathHelper pathHelper,
            IUserLocationsRepository userLocationsRepository,
            IUnitOfWork<POSDbContext> uow,
            IFileStorageService fileStorageService
            )
        {
            _mapper = mapper;
            _userManager = userManager;
            _roleManager = roleManager;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _userLocationsRepository = userLocationsRepository;
            _uow = uow;
            _fileStorageService = fileStorageService;
        }
        public async Task<ServiceResponse<UserDto>> Handle(AddUserCommand request, CancellationToken cancellationToken)
        {
            var appUser = await _userManager.FindByNameAsync(request.Email);
            if (appUser != null)
            {
                // Logic Adjustment: For Seeding, we might want to update or skip. 
                // But this command typically implies NEW user.
                // If ID matches, maybe update? For now, stick to standard "Conflict" logic.
                // However, check if we are seeding with same ID?
                if (request.Id.HasValue && appUser.Id == request.Id.Value)
                {
                     // Idempotency: Treat as Success/Skip or Update?
                     // Let's assume conflict for now to be safe, caller should check existence.
                }
                _logger.LogError("Email already exist for another user.");
                return ServiceResponse<UserDto>.Return409("Email already exist for another user.");
            }

            var entity = _mapper.Map<User>(request);
            
            // Set ID if provided (Seeding), else NewGuid
            entity.Id = request.Id ?? Guid.NewGuid();
            
            // Set Creator/Modifier
            var creatorId = request.CreatedBy ?? _userInfoToken.Id;
            entity.CreatedBy = creatorId;
            entity.ModifiedBy = creatorId;
            entity.CreatedDate = DateTime.UtcNow;
            entity.ModifiedDate = DateTime.UtcNow;
            
            // Set explicitly provided normalized values (Seeding optimization)
            if (!string.IsNullOrEmpty(request.NormalizedEmail)) entity.NormalizedEmail = request.NormalizedEmail;
            if (!string.IsNullOrEmpty(request.NormalizedUserName)) entity.NormalizedUserName = request.NormalizedUserName;
            
            // Handle IsSuperAdmin
            entity.IsSuperAdmin = request.IsSuperAdmin;
            
            // Handle TenantId override
            if (request.TenantId.HasValue)
            {
                entity.TenantId = request.TenantId.Value;
            }

            if (!string.IsNullOrEmpty(request.ImgSrc))
            {
                var imgageUrl = $"{Guid.NewGuid()}.png";
                entity.ProfilePhoto = imgageUrl;
            }

            // Create User via UserManager
            IdentityResult result = await _userManager.CreateAsync(entity, request.Password ?? AppConstants.Seeding.DefaultPassword);
            if (!result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500(string.Join(", ", result.Errors.Select(e => e.Description)));
            }

            // Assign Roles via UserManager
            if (request.RoleIds.Count > 0)
            {
                // Need to look up Role Names because AddToRolesAsync takes string names
                // OR we can manually add to UserRoles collection if we want to bypass checks, 
                // BUT better to use proper API if possible.
                // However, RoleManager works with Names. We have IDs.
                // Let's manually fetch role names for consistency.
                
                foreach (var roleId in request.RoleIds)
                {
                    var role = await _roleManager.FindByIdAsync(roleId.ToString());
                    if (role != null)
                    {
                        if (!await _userManager.IsInRoleAsync(entity, role.Name))
                        {
                            await _userManager.AddToRoleAsync(entity, role.Name);
                        }
                    }
                }
            }

            // Handle Locations
            if (request.Locations.Count > 0)
            {
                var userLocations = request.Locations.Select(l => new UserLocation
                {
                    LocationId = l,
                    UserId = entity.Id
                }).ToList();

                _userLocationsRepository.AddRange(userLocations);
                await _uow.SaveAsync();
            }

            if (!string.IsNullOrEmpty(request.ImgSrc))
            {
                await _fileStorageService.SaveFileAsync(_pathHelper.UserProfilePath, request.ImgSrc, entity.ProfilePhoto);
            }
            return ServiceResponse<UserDto>.ReturnResultWith200(_mapper.Map<UserDto>(entity));
        }
    }
}
