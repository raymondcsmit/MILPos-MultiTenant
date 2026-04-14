using POS.Helper;
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
                    Console.WriteLine($"[Register] Initializing tenant: {request.Subdomain}");
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
                    Console.WriteLine($"[Register] Tenant created with ID: {tenantId}");

                    // 3. Create Admin User via Command (Single Source of Truth)
                    Console.WriteLine($"[Register] Creating admin user: {request.AdminEmail}");
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
                    };

                    var userResult = await _mediator.Send(addUserCmd, cancellationToken);
                    if (!userResult.Success)
                    {
                        Console.WriteLine($"[Register] Admin user creation failed: {string.Join(", ", userResult.Errors)}");
                        throw new Exception($"Admin user creation failed: {string.Join(", ", userResult.Errors)}");
                    }
                    Console.WriteLine($"[Register] Admin user created: {userResult.Data.Id}");

                    // Create lightweight user object for seeding (ID is what matters)
                    var adminUser = new User { Id = userResult.Data.Id };

                    // 4. Seed Data
                    Console.WriteLine($"[Register] Seeding tenant data for: {tenantId}");
                    await _registrationService.SeedTenantDataAsync(tenant, adminUser);
                    Console.WriteLine($"[Register] Seeding completed for: {tenantId}");

                    await transaction.CommitAsync(cancellationToken);
                    return ServiceResponse<POS.Data.Entities.Tenant>.ReturnResultWith200(tenant);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Register] ERROR: {ex.Message}");
                    Console.WriteLine($"[Register] STACK TRACE: {ex.StackTrace}");
                    if (ex.InnerException != null) 
                    {
                        Console.WriteLine($"[Register] INNER ERROR: {ex.InnerException.Message}");
                        Console.WriteLine($"[Register] INNER STACK TRACE: {ex.InnerException.StackTrace}");
                    }
                    await transaction.RollbackAsync(cancellationToken);
                    return ServiceResponse<POS.Data.Entities.Tenant>.ReturnFailed(400, ex.Message);
                }
            });
        }

        }
    
}

