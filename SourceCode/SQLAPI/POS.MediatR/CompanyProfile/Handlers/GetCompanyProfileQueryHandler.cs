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
    ILocationRepository locationRepository,
    IFinancialYearRepository financialYearRepository,
    IMediator mediator,
    ICompanyProfileRepository companyProfileRepository,
    IMapper mapper,
    PathHelper pathHelper)
    : IRequestHandler<GetCompanyProfileQuery, CompanyProfileDto>
{

    public async Task<CompanyProfileDto> Handle(GetCompanyProfileQuery request, CancellationToken cancellationToken)
    {
        // Execute sequentially to preserve IHttpContextAccessor/Tenant context safely
        var locations = await locationRepository.All.AsNoTracking().ToListAsync(cancellationToken);
        var financialYears = await financialYearRepository.All.AsNoTracking().ToListAsync(cancellationToken);
        var languages = await mediator.Send(new GetAllLanguageCommand(), cancellationToken);
        var companyProfile = await companyProfileRepository.All.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

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
