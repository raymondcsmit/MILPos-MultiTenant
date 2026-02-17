using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Language.Commands;
using POS.Repository;
using POS.Repository.Accouting;

namespace POS.MediatR.Handlers;

public class GetCompanyProfileQueryHandler(
    IServiceScopeFactory serviceScopeFactory,
    IMapper mapper,
    PathHelper pathHelper)
    : IRequestHandler<GetCompanyProfileQuery, CompanyProfileDto>
{

    public async Task<CompanyProfileDto> Handle(GetCompanyProfileQuery request, CancellationToken cancellationToken)
    {
        // Define tasks to run in parallel using separate scopes to avoid DbContext threading issues
        var locationsTask = Task.Run(async () =>
        {
            using var scope = serviceScopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ILocationRepository>();
            return await repo.All.AsNoTracking().ToListAsync(cancellationToken);
        }, cancellationToken);

        var financialYearsTask = Task.Run(async () =>
        {
            using var scope = serviceScopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IFinancialYearRepository>();
            return await repo.All.AsNoTracking().ToListAsync(cancellationToken);
        }, cancellationToken);

        var languagesTask = Task.Run(async () =>
        {
            using var scope = serviceScopeFactory.CreateScope();
            var med = scope.ServiceProvider.GetRequiredService<IMediator>();
            return await med.Send(new GetAllLanguageCommand(), cancellationToken);
        }, cancellationToken);

        var companyProfileTask = Task.Run(async () =>
        {
            using var scope = serviceScopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ICompanyProfileRepository>();
            return await repo.All.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        }, cancellationToken);

        // Wait for all tasks to complete
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
        return response;
    }
}
