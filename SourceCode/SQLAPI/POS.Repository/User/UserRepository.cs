using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace POS.Repository;

public class UserRepository : GenericRepository<User, POSDbContext>,
      IUserRepository
{
    private readonly JwtSettings _settings = null;
    private readonly IUserClaimRepository _userClaimRepository;
    private readonly IRoleClaimRepository _roleClaimRepository;
    private readonly IUserRoleRepository _userRoleRepository;
    private readonly IUserLocationsRepository _userLocationsRepository;
    private readonly IPropertyMappingService _propertyMappingService;
    private readonly ILocationRepository _locationRepository;
    private readonly ICompanyProfileRepository _companyProfileRepository;

    public UserRepository(
        IUnitOfWork<POSDbContext> uow,
         JwtSettings settings,
         IUserClaimRepository userClaimRepository,
         IRoleClaimRepository roleClaimRepository,
         IUserRoleRepository userRoleRepository,
         IUserLocationsRepository userLocationsRepository,
         IPropertyMappingService propertyMappingService,
            ILocationRepository locationRepository,
             ICompanyProfileRepository companyProfileRepository
        ) : base(uow)
    {
        _roleClaimRepository = roleClaimRepository;
        _userClaimRepository = userClaimRepository;
        _userRoleRepository = userRoleRepository;
        _settings = settings;
        _userLocationsRepository = userLocationsRepository;
        _propertyMappingService = propertyMappingService;
        _locationRepository = locationRepository;
        _companyProfileRepository = companyProfileRepository;
    }

    public async Task<UserList> GetUsers(UserResource userResource)
    {
        var collectionBeforePaging = All;
        collectionBeforePaging =
           collectionBeforePaging.ApplySort(userResource.OrderBy,
           _propertyMappingService.GetPropertyMapping<UserDto, User>());
        if (!string.IsNullOrWhiteSpace(userResource.email))
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => EF.Functions.Like(c.Email, $"%{userResource.email}%"));
        }

        if (!string.IsNullOrWhiteSpace(userResource.FirstName))
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => EF.Functions.Like(c.FirstName, $"%{userResource.FirstName}%"));
        }

        if (!string.IsNullOrWhiteSpace(userResource.LastName))
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => EF.Functions.Like(c.LastName, $"%{userResource.LastName}%"));
        }

        if (!string.IsNullOrWhiteSpace(userResource.PhoneNumber))
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => EF.Functions.Like(c.PhoneNumber, $"%{userResource.PhoneNumber}%"));
        }

        var loginAudits = new UserList();
        return await loginAudits.Create(
            collectionBeforePaging,
            userResource.Skip,
            userResource.PageSize
            );
    }

    public async Task<UserAuthDto> BuildUserAuthObject(User appUser)
    {
        var companyProfile = await _companyProfileRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.TenantId == appUser.TenantId);
        List<Guid> locations;
        if (appUser.IsAllLocations)
        {
            locations = await _locationRepository.All.IgnoreQueryFilters().Where(c => c.TenantId == appUser.TenantId).Select(c => c.Id).ToListAsync();
        }
        else
        {
            locations = await _userLocationsRepository.All.IgnoreQueryFilters().Where(ul => ul.UserId == appUser.Id)
                .Select(d => d.LocationId).ToListAsync();
        }

        UserAuthDto ret = new UserAuthDto();
        List<AppClaimDto> appClaims = new List<AppClaimDto>();
        // Set User Properties
        ret.Id = appUser.Id;
        ret.UserName = appUser.UserName;
        ret.FirstName = appUser.FirstName;
        ret.LastName = appUser.LastName;
        ret.Email = appUser.Email;
        ret.PhoneNumber = appUser.PhoneNumber;
        ret.IsAuthenticated = true;
        ret.ProfilePhoto = appUser.ProfilePhoto;
        ret.IsSuperAdmin = appUser.IsSuperAdmin;
        ret.LicenseKey = string.IsNullOrEmpty(companyProfile.LicenseKey) ? "" : HttpUtility.UrlEncode(companyProfile.LicenseKey.ToString());
        ret.PurchaseCode = string.IsNullOrEmpty(companyProfile.PurchaseCode) ? "" : HttpUtility.UrlEncode(companyProfile.PurchaseCode.ToString());
        // Get Tenant ApiKey
        var tenant = await Context.Set<Data.Entities.Tenant>().IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == appUser.TenantId);
        ret.ApiKey = tenant?.ApiKey;

        // Get all claims for this user
        var appClaimDtos = await this.GetUserAndRoleClaims(appUser);
        ret.Claims = appClaimDtos.Select(c => c).ToList();
        var claims = appClaimDtos.Select(c => new Claim(c, "true")).ToList(); // Convert to List<Claim>
        claims.Add(new Claim("licensekey", string.IsNullOrEmpty(companyProfile.LicenseKey) ? "" : HttpUtility.UrlEncode(companyProfile.LicenseKey.ToString())));
        claims.Add(new Claim("purchasecode", string.IsNullOrEmpty(companyProfile.PurchaseCode) ? "" : HttpUtility.UrlEncode(companyProfile.PurchaseCode.ToString())));
        claims.Add(new Claim("isSuperAdmin", appUser.IsSuperAdmin.ToString().ToLower()));
        if (!string.IsNullOrEmpty(ret.ApiKey))
        {
            claims.Add(new Claim("ApiKey", ret.ApiKey));
        }

        // Set JWT bearer token
        ret.BearerToken = BuildJwtToken(ret, claims, appUser.Id, locations, appUser.TenantId);

        return ret;
    }

    private async Task<List<string>> GetUserAndRoleClaims(User appUser)
    {
        var userClaims = await _userClaimRepository.FindBy(c => c.UserId == appUser.Id).Select(c => c.ClaimType).ToListAsync();
        var roleClaims = await GetRoleClaims(appUser);
        var finalClaims = roleClaims;
        var finalUserClaims = new List<string>();
        foreach (var claim in userClaims)
        {
            if (!finalClaims.Contains(claim))
            {
                finalUserClaims.Add(claim);
            }
        }
        if (finalUserClaims.Count > 0)
        {
            finalClaims.AddRange(finalUserClaims);
        }
        finalClaims.AddRange(userClaims);
        finalClaims = finalClaims.Distinct().ToList();



        return finalClaims;
    }

    private async Task<List<string>> GetRoleClaims(User appUser)
    {
        var rolesIds = await _userRoleRepository.All.Where(c => c.UserId == appUser.Id)
            .Select(c => c.RoleId)
            .ToListAsync();
        List<RoleClaim> lstRoleClaim = new List<RoleClaim>();
        var roleClaims = await _roleClaimRepository.All.Where(c => rolesIds.Contains(c.RoleId)).Select(c => c.ClaimType).ToListAsync();
        return roleClaims;
    }

    protected string BuildJwtToken(UserAuthDto authUser, IList<Claim> claims, Guid Id, List<Guid> locationIds, Guid tenantId)
    {
        SymmetricSecurityKey key = new SymmetricSecurityKey(
          Encoding.UTF8.GetBytes(_settings.Key));
        claims.Add(new Claim(Microsoft.IdentityModel.JsonWebTokens.JwtRegisteredClaimNames.Sub.ToString(), Id.ToString()));
        claims.Add(new Claim("Email", authUser.Email));
        claims.Add(new Claim("locationIds", String.Join(",", locationIds)));
        claims.Add(new Claim("TenantId", tenantId.ToString())); // ✅ CRITICAL FIX: Add TenantId to JWT
        // Create the JwtSecurityToken object
        var token = new JwtSecurityToken(
          issuer: _settings.Issuer,
          audience: _settings.Audience,
          claims: claims,
          notBefore: DateTime.UtcNow,
          expires: DateTime.UtcNow.AddMinutes(
              _settings.MinutesToExpiration),
          signingCredentials: new SigningCredentials(key,
                      SecurityAlgorithms.HmacSha256)
        );
        // Create a string representation of the Jwt token
        return new JwtSecurityTokenHandler().WriteToken(token); ;
    }
}
