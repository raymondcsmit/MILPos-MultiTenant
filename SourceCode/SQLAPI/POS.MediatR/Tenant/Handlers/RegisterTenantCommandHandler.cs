using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using POS.Domain;
using System;
using System.Threading;
using System.Threading.Tasks;
using POS.Data;
using POS.Repository.Tenant; // Added this using statement

namespace POS.MediatR.Tenant.Handlers
{
    public class RegisterTenantCommandHandler : IRequestHandler<Commands.RegisterTenantCommand, ServiceResponse<POS.Data.Entities.Tenant>>
    {
        private readonly ITenantRegistrationService _registrationService;
        private readonly IMediator _mediator;
        private readonly POSDbContext _context;
        private readonly ITenantInitializationService _tenantInitializationService; // Added this field

        public RegisterTenantCommandHandler(
            ITenantRegistrationService registrationService,
            IMediator mediator,
            POSDbContext context,
            ITenantInitializationService tenantInitializationService) // Added this parameter
        {
            _registrationService = registrationService;
            _mediator = mediator;
            _context = context;
            _tenantInitializationService = tenantInitializationService; // Initialized the new field
        }

        public async Task<ServiceResponse<POS.Data.Entities.Tenant>> Handle(Commands.RegisterTenantCommand request, CancellationToken cancellationToken)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    // 1. Validation
                    if (await _context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Subdomain == request.Subdomain, cancellationToken))
                    {
                        return ServiceResponse<POS.Data.Entities.Tenant>.ReturnFailed(400, "Subdomain already exists.");
                    }

                    // 2. Create Tenant
                    var tenant = _tenantInitializationService.InitializeNewTenant(
                        request.Name, 
                        request.Subdomain, 
                        request.AdminEmail, 
                        request.Phone, 
                        request.Address, 
                        request.BusinessType);
                    
                    var tenantId = tenant.Id;

                    _context.Tenants.Add(tenant);
                    await _context.SaveChangesAsync(cancellationToken);

                    // 3. Create Admin User via Command (Single Source of Truth)
                    var addUserCmd = new AddUserCommand
                    {
                        Email = request.AdminEmail,
                        UserName = request.AdminEmail,
                        FirstName = "Admin",
                        LastName = "User",
                        Password = !string.IsNullOrEmpty(request.AdminPassword) ? request.AdminPassword : AppConstants.Seeding.DefaultPassword,
                        TenantId = tenantId,
                        IsActive = true,
                        IsAllLocations = true,
                        PhoneNumber = request.Phone,
                        // Roles are assigned during seeding
                    };

                    var userResult = await _mediator.Send(addUserCmd, cancellationToken);
                    if (!userResult.Success)
                    {
                        // Transaction will rollback
                        throw new Exception($"Admin user creation failed: {string.Join(", ", userResult.Errors)}");
                    }

                    // Create lightweight user object for seeding (ID is what matters)
                    var adminUser = new User { Id = userResult.Data.Id };

                    // 4. Seed Data
                    await _registrationService.SeedTenantDataAsync(tenant, adminUser);

                    await transaction.CommitAsync(cancellationToken);
                    return ServiceResponse<POS.Data.Entities.Tenant>.ReturnResultWith200(tenant);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return ServiceResponse<POS.Data.Entities.Tenant>.ReturnFailed(400, ex.Message);
                }
            });
        }

        }
    
}
