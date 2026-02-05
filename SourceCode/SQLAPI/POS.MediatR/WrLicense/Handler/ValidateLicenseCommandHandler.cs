using MediatR;
using Microsoft.Extensions.Caching.Memory;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.WrLicense.Command;
using POS.Repository;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.WrLicense.Handler
{
    public class ValidateLicenseCommandHandler : IRequestHandler<ValidateLicenseCommand, ServiceResponse<UserAuthDto>>
    {
        private readonly ICompanyProfileRepository _companyProfileRepository;
        private readonly IUnitOfWork<POSDbContext> _unitOfWork;
        private readonly IMemoryCache _cache;

        public ValidateLicenseCommandHandler(
            ICompanyProfileRepository companyProfileRepository,
            IUnitOfWork<POSDbContext> unitOfWork,
            IMemoryCache cache)
        {
            _companyProfileRepository = companyProfileRepository;
            _unitOfWork = unitOfWork;
            _cache = cache;
        }

        public async Task<ServiceResponse<UserAuthDto>> Handle(ValidateLicenseCommand request, CancellationToken cancellationToken)
        {
            // Simulate Validation logic
            if (string.IsNullOrWhiteSpace(request.PurchaseCode))
            {
                return ServiceResponse<UserAuthDto>.Return409("Purchase Code is required.");
            }

            // In a real scenario, we would call an external API here to validate the code.
            // For now, we accept any code that is not empty.
            
            // Get the first profile (Single Tenant / Desktop Context)
            var profile = _companyProfileRepository.All.FirstOrDefault(); 
            
            if (profile != null)
            {
                // Simulate receiving a real key from licensing server
                var newLicenseKey = Guid.NewGuid().ToString("N").ToUpper(); 
                
                profile.PurchaseCode = request.PurchaseCode;
                profile.LicenseKey = newLicenseKey;
                
                _companyProfileRepository.Update(profile);
                await _unitOfWork.SaveAsync();
                
                // CRITICAL: Invalidate Cache so Middleware picks it up
                _cache.Remove("CompanyProfile_License");
                
                var data = new UserAuthDto
                {
                    IsAuthenticated = true,
                    PurchaseCode = request.PurchaseCode,
                    LicenseKey = newLicenseKey,
                    BearerToken = "DUMMY_TOKEN_FOR_LICENSE_VALIDATION" 
                };
                
                return ServiceResponse<UserAuthDto>.ReturnResultWith200(data);
            }
            
            return ServiceResponse<UserAuthDto>.Return404("Company Profile not found.");
        }
    }
}
