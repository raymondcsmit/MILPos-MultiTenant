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
        IUnitOfWork<POSDbContext> _uow;
        private readonly IFileStorageService _fileStorageService;

        public AddUserCommandHandler(
            IMapper mapper,
            UserManager<User> userManager,
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
                _logger.LogError("Email already exist for another user.");
                return ServiceResponse<UserDto>.Return409("Email already exist for another user.");
            }

            var entity = _mapper.Map<User>(request);
            entity.CreatedBy = _userInfoToken.Id;
            entity.ModifiedBy = _userInfoToken.Id;
            entity.CreatedDate = DateTime.UtcNow;
            entity.ModifiedDate = DateTime.UtcNow;
            entity.Id = Guid.NewGuid();

            if (request.RoleIds.Count > 0)
            {
                foreach (var roleId in request.RoleIds)
                {
                    entity.UserRoles.Add(new UserRole
                    {
                        RoleId = roleId,
                        UserId = entity.Id
                    });
                }
            }

            if (!string.IsNullOrEmpty(request.ImgSrc))
            {
                var imgageUrl = $"{Guid.NewGuid()}.png";
                entity.ProfilePhoto = imgageUrl;
            }

            IdentityResult result = await _userManager.CreateAsync(entity);
            if (!result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500();
            }

            if (!string.IsNullOrEmpty(request.Password))
            {
                string code = await _userManager.GeneratePasswordResetTokenAsync(entity);
                IdentityResult passwordResult = await _userManager.ResetPasswordAsync(entity, code, request.Password);
                if (!passwordResult.Succeeded)
                {
                    return ServiceResponse<UserDto>.Return500();
                }
            }

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
