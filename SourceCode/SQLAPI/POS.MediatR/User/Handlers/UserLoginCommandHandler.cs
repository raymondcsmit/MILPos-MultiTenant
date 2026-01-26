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

        public UserLoginCommandHandler(
            IUserRepository userRepository,
            SignInManager<User> signInManager,
            UserManager<User> userManager,
            ILoginAuditRepository loginAuditRepository,
            IHubContext<UserHub, IHubClient> hubContext,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment,
            IFileStorageService fileStorageService
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

            var user = await _userManager.FindByNameAsync(request.UserName);
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
                    .Where(c => c.UserName == request.UserName)
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
                return ServiceResponse<UserAuthDto>.ReturnResultWith200(authUser);
            }
            else
            {
                await _loginAuditRepository.LoginAudit(loginAudit);
                return ServiceResponse<UserAuthDto>.ReturnFailed(401, "UserName Or Password is InCorrect.");
            }
        }
    }
}
