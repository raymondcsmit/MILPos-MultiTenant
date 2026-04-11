using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Language.Commands;
using POS.Repository;
using POS.Repository.Accouting;

namespace POS.MediatR.Handlers;

public class GetCompanyProfileQueryHandler(
    IServiceScopeFactory scopeFactory,
    IMemoryCache cache,
    ITenantProvider tenantProvider,
    IMediator mediator,
    IMapper mapper,
    PathHelper pathHelper)
    : IRequestHandler<GetCompanyProfileQuery, CompanyProfileDto>
{

    public async Task<CompanyProfileDto> Handle(GetCompanyProfileQuery request, CancellationToken cancellationToken)
    {
        var tenantId = tenantProvider.GetTenantId();
        string cacheKey = $"CompanyProfile_{tenantId}";

        if (cache.TryGetValue(cacheKey, out CompanyProfileDto cachedResponse))
        {
            return cachedResponse;
        }

        // Parallelize database queries using separate scopes to avoid DbContext concurrency issues
        var locationsTask = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ILocationRepository>();
            return await repo.All.AsNoTracking().ToListAsync(cancellationToken);
        }, cancellationToken);

        var financialYearsTask = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IFinancialYearRepository>();
            return await repo.All.AsNoTracking().ToListAsync(cancellationToken);
        }, cancellationToken);

        var languagesTask = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var scopedMediator = scope.ServiceProvider.GetRequiredService<IMediator>();
            return await scopedMediator.Send(new GetAllLanguageCommand(), cancellationToken);
        }, cancellationToken);

        var companyProfileTask = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ICompanyProfileRepository>();
            return await repo.All.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        }, cancellationToken);

        await Task.WhenAll(locationsTask, financialYearsTask, languagesTask, companyProfileTask);

        var locations = await locationsTask;
        var financialYears = await financialYearsTask;
        var languages = await languagesTask;
        var companyProfile = await companyProfileTask;

        if (companyProfile == null)
        {
            companyProfile = new CompanyProfile
            {
                Address = "3822 Crim Lane Dayton, OH 45407",
                LogoUrl = "",
                Title = "Point of Sale",
                CurrencyCode = "USD",
                PurchaseCode = string.Empty,
                LicenseKey = string.Empty
            };
        }

        var response = mapper.Map<CompanyProfileDto>(companyProfile);
        response.Languages = languages;
        response.Locations = mapper.Map<List<LocationDto>>(locations);
        response.FinancialYears = mapper.Map<List<FinancialYearDto>>(financialYears);
        if (!string.IsNullOrWhiteSpace(response.LogoUrl))
        {
            var logoFileName = Path.GetFileName(response.LogoUrl);
            response.LogoUrl = Path.Combine(pathHelper.CompanyLogo, logoFileName).Replace("\\", "/");
        }

        cache.Set(cacheKey, response, TimeSpan.FromHours(24));
        return response;
    }
}
