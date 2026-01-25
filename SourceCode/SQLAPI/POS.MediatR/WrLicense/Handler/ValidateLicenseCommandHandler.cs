using MediatR;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.WrLicense.Command;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.WrLicense.Handler
{
    public class ValidateLicenseCommandHandler : IRequestHandler<ValidateLicenseCommand, ServiceResponse<UserAuthDto>>
    {
        public async Task<ServiceResponse<UserAuthDto>> Handle(ValidateLicenseCommand request, CancellationToken cancellationToken)
        {
            // Internal validation logic - always success for now as requested
            
            // Return success with dummy data
            var data = new UserAuthDto
            {
                IsAuthenticated = true,
                PurchaseCode = request.PurchaseCode,
                LicenseKey = "INTERNAL-LICENSE-KEY",
                BearerToken = "DUMMY_TOKEN_FOR_LICENSE_VALIDATION" 
            };
            
            return await Task.FromResult(ServiceResponse<UserAuthDto>.ReturnResultWith200(data));
        }
    }
}
