using MediatR;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Helper;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class RegisterTenantCommandHandler : IRequestHandler<Commands.RegisterTenantCommand, ServiceResponse<POS.Data.Entities.Tenant>>
    {
        private readonly ITenantRegistrationService _registrationService;

        public RegisterTenantCommandHandler(ITenantRegistrationService registrationService)
        {
            _registrationService = registrationService;
        }

        public async Task<ServiceResponse<POS.Data.Entities.Tenant>> Handle(Commands.RegisterTenantCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var dto = new RegisterTenantDto
                {
                    Name = request.Name,
                    Subdomain = request.Subdomain,
                    AdminEmail = request.AdminEmail,
                    AdminPassword = request.AdminPassword,
                    Phone = request.Phone,
                    Address = request.Address
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
