using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
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
    ICompanyProfileRepository companyProfileRepository,
    IMapper mapper,
    PathHelper pathHelper,
    ILanguageRepository languageRepository,
    ILocationRepository locationRepository,
    IFinancialYearRepository financialYearRepository,
    IMediator mediator)
    : IRequestHandler<GetCompanyProfileQuery, CompanyProfileDto>
{

    public async Task<CompanyProfileDto> Handle(GetCompanyProfileQuery request, CancellationToken cancellationToken)
    {
        var locations = await locationRepository.All.ToListAsync();
        var financialYears = await financialYearRepository.All.ToListAsync();
        var languages = await languageRepository.All.OrderBy(c => c.Order).ToListAsync();
        var companyProfile = await companyProfileRepository.All.FirstOrDefaultAsync();
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
        response.Languages = await mediator.Send(new GetAllLanguageCommand());
        response.Locations = mapper.Map<List<LocationDto>>(locations);
        response.FinancialYears = mapper.Map<List<FinancialYearDto>>(financialYears);
        if (!string.IsNullOrWhiteSpace(response.LogoUrl))
        {
            response.LogoUrl = Path.Combine(pathHelper.CompanyLogo, response.LogoUrl);
        }
        return mapper.Map<CompanyProfileDto>(response);
    }
}
