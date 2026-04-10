using POS.Helper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common;
using POS.Data;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.Repository;
using POS.Repository.Tenant;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class CreateTenantCommandHandler : IRequestHandler<Commands.CreateTenantCommand, ServiceResponse<POS.Data.Entities.Tenant>>
    {
        private readonly ITenantRegistrationService _registrationService;
        private readonly ITenantInitializationService _tenantInitializationService;
        private readonly IMediator _mediator;
        private readonly POSDbContext _context;

        public CreateTenantCommandHandler(
            ITenantRegistrationService registrationService,
            ITenantInitializationService tenantInitializationService,
            IMediator mediator,
            POSDbContext context)
        {
            _registrationService = registrationService;
            _tenantInitializationService = tenantInitializationService;
            _mediator = mediator;
            _context = context;
        }

        public async Task<ServiceResponse<POS.Data.Entities.Tenant>> Handle(Commands.CreateTenantCommand request, CancellationToken cancellationToken)
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
                        request.ContactEmail, 
                        request.ContactPhone, 
                        request.Address, 
                        request.BusinessType);
                    
                    var tenantId = tenant.Id;

                    _context.Tenants.Add(tenant);
                    await _context.SaveChangesAsync(cancellationToken);

                    // 3. Create Admin User via Command (Single Source of Truth)
                    var addUserCmd = new CommandAndQuery.AddUserCommand
                    {
                        Email = request.AdminEmail ?? request.ContactEmail,
                        UserName = request.AdminEmail ?? request.ContactEmail,
                        FirstName = "Admin",
                        LastName = "User",
                        Password = request.AdminPassword ?? AppConstants.Seeding.DefaultPassword,
                        TenantId = tenantId,
                        IsActive = true,
                        IsAllLocations = true,
                        PhoneNumber = request.ContactPhone,
                        // Roles are assigned during seeding
                    };

                    var userResult = await _mediator.Send(addUserCmd, cancellationToken);
                    if (!userResult.Success)
                    {
                        throw new Exception($"Admin user creation failed: {string.Join(", ", userResult.Errors)}");
                    }

                    // Create lightweight user object for seeding
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

