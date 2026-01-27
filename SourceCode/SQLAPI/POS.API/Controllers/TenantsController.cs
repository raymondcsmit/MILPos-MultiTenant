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
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantsController : ControllerBase
    {
        private readonly POSDbContext _context;
        private readonly TenantDataMigrationService _migrationService;
        private readonly IMediator _mediator;

        public TenantsController(POSDbContext context, TenantDataMigrationService migrationService, IMediator mediator)
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
        [Authorize(Roles = "SuperAdmin")]
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
        [Authorize(Roles = "SuperAdmin")]
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
        [Authorize(Roles = "SuperAdmin")]
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

            var tenant = await _migrationService.CreateTenant(dto.Name, dto.Subdomain, dto.ContactEmail);

            return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
        }

        /// <summary>
        /// Update tenant (SuperAdmin only)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin")]
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
        [Authorize(Roles = "SuperAdmin")]
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
        [Authorize(Roles = "SuperAdmin")]
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
    }

    public class CreateTenantDto
    {
        public string Name { get; set; }
        public string Subdomain { get; set; }
        public string ContactEmail { get; set; }
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
}
