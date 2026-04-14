using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using Microsoft.AspNetCore.Hosting;
using POS.Common.Services;

namespace POS.MediatR.Handlers
{
    public class UpdateUserProfilePhotoCommandHandler : IRequestHandler<UpdateUserProfilePhotoCommand, ServiceResponse<UserDto>>
    {
        private readonly IMapper _mapper;
        private readonly UserManager<User> _userManager;
        IUnitOfWork<POSDbContext> _uow;
        private UserInfoToken _userInfoToken;
        private readonly ILogger<UpdateUserProfileCommandHandler> _logger;
        public readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly IFileStorageService _fileStorageService;
        public UpdateUserProfilePhotoCommandHandler(
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            UserInfoToken userInfoToken,
            UserManager<User> userManager,
            ILogger<UpdateUserProfileCommandHandler> logger,
            PathHelper pathHelper,

            IWebHostEnvironment webHostEnvironment,
            IFileStorageService fileStorageService
            )
        {
            _mapper = mapper;
            _userManager = userManager;
            _uow = uow;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _pathHelper = pathHelper;

            _webHostEnvironment = webHostEnvironment;
            _fileStorageService = fileStorageService;
        }

        public async Task<ServiceResponse<UserDto>> Handle(UpdateUserProfilePhotoCommand request, CancellationToken cancellationToken)
        {
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.UserProfilePath);
            Console.WriteLine($"[DEBUG] UpdateUserProfilePhoto - Target Directory: {filePath}");
            var appUser = await _userManager.FindByIdAsync(_userInfoToken.Id.ToString());
            if (appUser == null)
            {
                _logger.LogError("User does not exist.");
                return ServiceResponse<UserDto>.Return409("User does not exist.");
            }
            if (!Directory.Exists(filePath))
            {
                Console.WriteLine($"[DEBUG] Directory does not exist. Creating...");
                Directory.CreateDirectory(filePath);
            }
            // delete existing file
            if (!string.IsNullOrWhiteSpace(appUser.ProfilePhoto))
            {
                _fileStorageService.DeleteFile(Path.Combine(_pathHelper.UserProfilePath, appUser.ProfilePhoto));
            }

            // save new file
            if (request.FormFile.Any())
            {
                var profileFile = request.FormFile[0];
                var newProfilePhoto = $"{Guid.NewGuid()}{Path.GetExtension(profileFile.Name)}";
                
                using (var memoryStream = new MemoryStream())
                {
                    await profileFile.CopyToAsync(memoryStream);
                    await _fileStorageService.SaveFileAsync(_pathHelper.UserProfilePath, memoryStream.ToArray(), newProfilePhoto);
                }
                appUser.ProfilePhoto = newProfilePhoto;
            }
            else
            {
                appUser.ProfilePhoto = "";
            }

            // update user
            IdentityResult result = await _userManager.UpdateAsync(appUser);
            if (await _uow.SaveAsync() <= 0 && !result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500();
            }

            if (!string.IsNullOrWhiteSpace(appUser.ProfilePhoto))
                appUser.ProfilePhoto = Path.Combine(_pathHelper.UserProfilePath, appUser.ProfilePhoto).Replace("\\", "/");
            return ServiceResponse<UserDto>.ReturnResultWith200(_mapper.Map<UserDto>(appUser));
        }
    }
}
