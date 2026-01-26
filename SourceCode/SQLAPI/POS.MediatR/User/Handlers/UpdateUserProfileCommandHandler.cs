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

        public UpdateUserProfileCommandHandler(
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            UserInfoToken userInfoToken,
            UserManager<User> userManager,
            ILogger<UpdateUserProfileCommandHandler> logger,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment
            )
        {
            _mapper = mapper;
            _userManager = userManager;
            _uow = uow;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
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
                var filePath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.UserProfilePath);
                if (!Directory.Exists(filePath))
                {
                    Directory.CreateDirectory(filePath);
                }

                // Delete existing file
                if (!string.IsNullOrWhiteSpace(appUser.ProfilePhoto))
                {
                    try
                    {
                        var existingFile = Path.Combine(filePath, appUser.ProfilePhoto);
                        if (File.Exists(existingFile))
                        {
                            File.Delete(existingFile);
                        }
                    }
                    catch (UnauthorizedAccessException) 
                    {
                        // Try deleting from alternate path
                         var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", _pathHelper.UserProfilePath);
                         var existingFileAppData = Path.Combine(appDataPath, appUser.ProfilePhoto);
                         if (File.Exists(existingFileAppData))
                         {
                             try { File.Delete(existingFileAppData); } catch { }
                         }
                    }
                    catch (Exception ex)
                    {
                         _logger.LogError(ex, "Error deleting existing profile photo.");
                    }
                }

                // Save new file
                var base64Data = request.ImgSrc.Contains(",") ? request.ImgSrc.Split(',')[1] : request.ImgSrc;
                var bytes = Convert.FromBase64String(base64Data);
                var fileName = $"{Guid.NewGuid()}.png"; // Assuming PNG for base64, or detect mime type if needed
                var fullPath = Path.Combine(filePath, fileName);
                
                try
                {
                    await File.WriteAllBytesAsync(fullPath, bytes);
                }
                catch (UnauthorizedAccessException)
                {
                     // Fallback to ProgramData
                     var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", _pathHelper.UserProfilePath);
                     if (!Directory.Exists(appDataPath))
                     {
                         Directory.CreateDirectory(appDataPath);
                     }
                     fullPath = Path.Combine(appDataPath, fileName);
                     await File.WriteAllBytesAsync(fullPath, bytes);
                }
                appUser.ProfilePhoto = fileName;
            }

            IdentityResult result = await _userManager.UpdateAsync(appUser);
            if (await _uow.SaveAsync() <= 0 && !result.Succeeded)
            {
                return ServiceResponse<UserDto>.Return500();
            }
            if (!string.IsNullOrWhiteSpace(appUser.ProfilePhoto))
            {
                var fullPath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.UserProfilePath, appUser.ProfilePhoto);
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "MILPOS", "wwwroot", _pathHelper.UserProfilePath, appUser.ProfilePhoto);
                
                if (File.Exists(fullPath) || File.Exists(appDataPath))
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
