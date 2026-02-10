using MediatR;
using POS.Data.Dto.Tenant;
using POS.Helper;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class CreateTenantCommandHandler : IRequestHandler<Commands.CreateTenantCommand, ServiceResponse<POS.Data.Entities.Tenant>>
    {
        private readonly ITenantRegistrationService _registrationService;

        public CreateTenantCommandHandler(ITenantRegistrationService registrationService)
        {
            _registrationService = registrationService;
        }

        public async Task<ServiceResponse<POS.Data.Entities.Tenant>> Handle(Commands.CreateTenantCommand request, CancellationToken cancellationToken)
        {
            try
            {
                // Map CreateTenantCommand to RegisterTenantDto
                var dto = new RegisterTenantDto
                {
                    Name = request.Name,
                    Subdomain = request.Subdomain,
                    AdminEmail = request.AdminEmail ?? request.ContactEmail, // Use ContactEmail as fallback
                    AdminPassword = request.AdminPassword ?? "Admin@123", // Default password if not provided
                    Phone = request.ContactPhone,
                    Address = request.Address,
                    BusinessType = request.BusinessType ?? "Retail" // Default to Retail
                };

                var tenant = await _registrationService.RegisterTenantAsync(dto);
                return ServiceResponse<POS.Data.Entities.Tenant>.ReturnResultWith200(tenant);
            }
            catch (Exception ex)
            {
                return ServiceResponse<POS.Data.Entities.Tenant>.ReturnFailed(400, ex.Message);
            }
        }
    }
}
