using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using POS.API.Services;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Domain;
using POS.MediatR.Tenant.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using POS.Data;
using POS.Common;

namespace POS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantsController : ControllerBase
    {
        private readonly POSDbContext _context;
        private readonly TenantDataMigrationService _migrationService;
        private readonly IMediator _mediator;

        public TenantsController(
            POSDbContext context, 
            TenantDataMigrationService migrationService, 
            IMediator mediator)
        {
            _context = context;
            _migrationService = migrationService;
            _mediator = mediator;
        }

        /// <summary>
        /// Register a new tenant (Public)
        /// </summary>
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<Tenant>> Register([FromBody] RegisterTenantDto dto)
        {
            var command = new RegisterTenantCommand
            {
                Name = dto.Name,
                Subdomain = dto.Subdomain,
                AdminEmail = dto.AdminEmail,
                AdminPassword = dto.AdminPassword,
                Phone = dto.Phone,
                Address = dto.Address
            };

            var response = await _mediator.Send(command);
            
            if (response.StatusCode == 200)
            {
                return Ok(response.Data);
            }
            
            return BadRequest(new { message = string.Join(", ", response.Errors) });
        }

        /// <summary>
        /// Get all tenants (SuperAdmin only)
        /// </summary>
        [HttpGet]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult<List<Tenant>>> GetAllTenants()
        {
            var tenants = await _context.Tenants
                .IgnoreQueryFilters()
                .OrderBy(t => t.Name)
                .ToListAsync();
            
            return Ok(tenants);
        }

        /// <summary>
        /// Get tenant by ID (SuperAdmin only)
        /// </summary>
        [HttpGet("{id}")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult<Tenant>> GetTenant(Guid id)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id);
            
            if (tenant == null)
                return NotFound();

            return Ok(tenant);
        }

        /// <summary>
        /// Create a new tenant (SuperAdmin only)
        /// </summary>
        [HttpPost]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult<Tenant>> CreateTenant([FromBody] CreateTenantDto dto)
        {
            // Check if subdomain already exists
            var existingTenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Subdomain == dto.Subdomain);

            if (existingTenant != null)
            {
                return BadRequest(new { message = "Subdomain already exists" });
            }

            var tenant = await _migrationService.CreateTenant(dto.Name,dto.Subdomain,dto.ContactEmail);

            return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
        }

        /// <summary>
        /// Update tenant (SuperAdmin only)
        /// </summary>
        [HttpPut("{id}")]
        //[Authorize(Roles = "SuperAdmin")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult<Tenant>> UpdateTenant(Guid id, [FromBody] UpdateTenantDto dto)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
                return NotFound();

            tenant.Name = dto.Name ?? tenant.Name;
            tenant.ContactEmail = dto.ContactEmail ?? tenant.ContactEmail;
            tenant.ContactPhone = dto.ContactPhone ?? tenant.ContactPhone;
            tenant.Address = dto.Address ?? tenant.Address;
            tenant.IsActive = dto.IsActive ?? tenant.IsActive;
            tenant.MaxUsers = dto.MaxUsers ?? tenant.MaxUsers;
            tenant.SubscriptionPlan = dto.SubscriptionPlan ?? tenant.SubscriptionPlan;

            await _context.SaveChangesAsync();

            return Ok(tenant);
        }

        /// <summary>
        /// Deactivate tenant (SuperAdmin only)
        /// </summary>
        [HttpDelete("{id}")]
        //[Authorize(Roles = "SuperAdmin")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult> DeactivateTenant(Guid id)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
                return NotFound();

            tenant.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Migrate existing data to default tenant (SuperAdmin only, one-time operation)
        /// </summary>
        [HttpPost("migrate-to-default")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        //[Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult> MigrateToDefaultTenant()
        {
            try
            {
                await _migrationService.MigrateExistingDataToDefaultTenant();
                return Ok(new { message = "Data migration completed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Migration failed: {ex.Message}" });
            }
        }
        /// <summary>
        /// Update tenant subscription/license type
        /// </summary>
        [HttpPut("{id}/license")]
        //[Authorize(Roles = "SuperAdmin")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult> UpdateLicense(Guid id, [FromBody] UpdateLicenseDto dto)
        {
            var command = new UpdateTenantLicenseCommand
            {
                TenantId = id,
                LicenseType = Enum.Parse<LicenseType>(dto.LicenseType).ToString()
            };
            var response = await _mediator.Send(command);
            if (!response.Success) return NotFound();
            return Ok();
        }

        /// <summary>
        /// Toggle tenant status (Active/Inactive)
        /// </summary>
        [HttpPut("{id}/status")]
        //[Authorize(Roles = "SuperAdmin")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult> ToggleStatus(Guid id, [FromBody] UpdateStatusDto dto)
        {
            var command = new ToggleTenantStatusCommand { TenantId = id };
            var response = await _mediator.Send(command);
            if (!response.Success) return NotFound();
            return Ok(response.Data);
        }

        /// <summary>
        /// Switch to a specific tenant (Impersonation)
        /// </summary>
        [HttpPost("{id}/switch")]
        //[Authorize(Roles = "SuperAdmin")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult> SwitchTenant(Guid id)
        {
            var command = new SwitchTenantCommand
            {
                TenantId = id,
                Email = User.FindFirstValue(AppConstants.Claims.Email) ?? User.FindFirstValue(ClaimTypes.Email)
            };

            var response = await _mediator.Send(command);
            if (!response.Success) return StatusCode(response.StatusCode, string.Join(", ", response.Errors));

            return Ok(new
            {
                token = response.Data.BearerToken,
                tenantId = id
            });
        }

        /// <summary>
        /// Generate License Key and Purchase Code for a tenant
        /// </summary>
        [HttpPost("{id}/license/generate")]
        //[Authorize(Roles = "SuperAdmin")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<ActionResult> GenerateLicenseKeys(Guid id)
        {
            var command = new GenerateTenantLicenseKeysCommand { TenantId = id };
            var response = await _mediator.Send(command);

            if (!response.Success) return StatusCode(response.StatusCode, string.Join(", ", response.Errors));

            return Ok(new
            {
                LicenseKey = response.Data.LicenseKey,
                PurchaseCode = response.Data.PurchaseCode,
                Message = "License keys generated and Company Profile updated."
            });
        }

        /// <summary>
        /// Export Tenant Data to SQLite (Offline Mode)
        /// </summary>
        [HttpPost("{id}/export-sqlite")]
        [Authorize(Policy = AppConstants.Policies.SuperAdmin)]
        public async Task<IActionResult> ExportTenantToSqlite(Guid id)
        {
            var command = new ExportTenantToSqliteCommand { TenantId = id };
            var response = await _mediator.Send(command);

            if (!response.Success)
            {
                return StatusCode(response.StatusCode, string.Join(", ", response.Errors));
            }

            return File(response.Data.FileContent, response.Data.ContentType, response.Data.FileName);
        }

    }

    public class CreateTenantDto
    {
        public string Name { get; set; }
        public string Subdomain { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public string Address { get; set; }
        public string AdminEmail { get; set; }
        public string AdminPassword { get; set; }
    }

    public class UpdateTenantDto
    {
        public string Name { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public string Address { get; set; }
        public bool? IsActive { get; set; }
        public int? MaxUsers { get; set; }
        public string SubscriptionPlan { get; set; }
    }

    public class UpdateLicenseDto
    {
        public string LicenseType { get; set; }
    }

    public class UpdateStatusDto
    {
        public bool IsActive { get; set; }
    }
}
