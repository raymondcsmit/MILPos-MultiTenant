using System;
using AutoMapper;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.MediatR.CommandAndQuery;
using MediatR;
using Microsoft.AspNetCore.Identity;
using System.Threading;
using System.Threading.Tasks;
using POS.Helper;
using Microsoft.Extensions.Logging;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using POS.Common.Services;


namespace POS.MediatR.Handlers
{
    public class UpdateUserProfileCommandHandler : IRequestHandler<UpdateUserProfileCommand, ServiceResponse<UserDto>>
    {
        private readonly UserManager<User> _userManager;
        IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private UserInfoToken _userInfoToken;
        private readonly ILogger<UpdateUserProfileCommandHandler> _logger;
        public readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly IFileStorageService _fileStorageService;

        public UpdateUserProfileCommandHandler(
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

        public async Task<ServiceResponse<UserDto>> Handle(UpdateUserProfileCommand request, CancellationToken cancellationToken)
        {
            var appUser = await _userManager.FindByIdAsync(_userInfoToken.Id.ToString());
            if (appUser == null)
            {
                _logger.LogError("User does not exist.");
                return ServiceResponse<UserDto>.Return409("User does not exist.");
            }
            appUser.FirstName = request.FirstName;
            appUser.LastName = request.LastName;
            appUser.PhoneNumber = request.PhoneNumber;
            appUser.Address = request.Address;

            if (request.IsImageUpdate && !string.IsNullOrWhiteSpace(request.ImgSrc))
            {
                // Delete existing file
                if (!string.IsNullOrWhiteSpace(appUser.ProfilePhoto))
                {
                    _fileStorageService.DeleteFile(Path.Combine(_pathHelper.UserProfilePath, appUser.ProfilePhoto));
                }

                // Save new file
                var fileName = $"{Guid.NewGuid()}.png"; 
                await _fileStorageService.SaveFileAsync(_pathHelper.UserProfilePath, request.ImgSrc, fileName);
                appUser.ProfilePhoto = fileName;
            }

            IdentityResult result = await _userManager.UpdateAsync(appUser);
            if (await _uow.SaveAsync() <= 0 && !result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500();
            }
            if (!string.IsNullOrWhiteSpace(appUser.ProfilePhoto))
            {
                var physicalPath = _fileStorageService.GetPhysicalPath(Path.Combine(_pathHelper.UserProfilePath, appUser.ProfilePhoto));
                if (File.Exists(physicalPath))
                {
                    appUser.ProfilePhoto = Path.Combine(_pathHelper.UserProfilePath, appUser.ProfilePhoto).Replace("\\", "/");
                }
                else
                {
                    appUser.ProfilePhoto = null;
                }
            }
                
            return ServiceResponse<UserDto>.ReturnResultWith200(_mapper.Map<UserDto>(appUser));
        }
    }

}
