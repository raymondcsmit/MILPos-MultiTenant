using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Language.Commands;
using POS.Repository;
using POS.Repository.Accouting;
using POS.Common.Services;

namespace POS.MediatR.Handlers
{
    public class UpdateCompanyProfileCommandHandler
        : IRequestHandler<UpdateCompanyProfileCommand, ServiceResponse<CompanyProfileDto>>
    {
        private readonly ICompanyProfileRepository _companyProfileRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<UpdateCompanyProfileCommandHandler> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        private readonly ILanguageRepository _languageRepository;
        private readonly ILocationRepository _locationRepository;
        private readonly IFinancialYearRepository _financialYearRepository;
        private readonly IMediator _mediator;
        private readonly IFileStorageService _fileStorageService;

        public UpdateCompanyProfileCommandHandler(
            ICompanyProfileRepository companyProfileRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<UpdateCompanyProfileCommandHandler> logger,
            IWebHostEnvironment webHostEnvironment,
            PathHelper pathHelper,
            ILanguageRepository languageRepository,
            ILocationRepository locationRepository,
            IFinancialYearRepository financialYearRepository,
            IMediator mediator,
            IFileStorageService fileStorageService)
        {
            _companyProfileRepository = companyProfileRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _languageRepository = languageRepository;
            _locationRepository = locationRepository;
            _financialYearRepository = financialYearRepository;
            _mediator = mediator;
            _fileStorageService = fileStorageService;
        }
        public async Task<ServiceResponse<CompanyProfileDto>> Handle(UpdateCompanyProfileCommand request, CancellationToken cancellationToken)
        {
            var logoUrl = string.Empty;
            var oldLogoUrl = string.Empty;

            if (!string.IsNullOrWhiteSpace(request.ImageData))
            {
                var ext = Path.GetExtension(request.LogoUrl);
                if (string.IsNullOrWhiteSpace(ext)) ext = ".png";
                logoUrl = $"{Guid.NewGuid()}{ext}";
            }

            CompanyProfile companyProfile;
            if (request.Id.HasValue)
            {
                companyProfile = await _companyProfileRepository.FindAsync(request.Id.Value);
                if (companyProfile != null)
                {
                    companyProfile.Title = request.Title;
                    companyProfile.Address = request.Address;
                    companyProfile.Phone = request.Phone;
                    companyProfile.Email = request.Email;
                    companyProfile.CurrencyCode = request.CurrencyCode;
                    companyProfile.TaxNumber = request.TaxNumber;
                    if (!string.IsNullOrWhiteSpace(request.ImageData))
                    {
                        oldLogoUrl = companyProfile.LogoUrl;
                        companyProfile.LogoUrl = logoUrl;
                    }
                    _companyProfileRepository.Update(companyProfile);
                }
                else
                {
                    companyProfile = new CompanyProfile
                    {
                        Address = request.Address,
                        Title = request.Title
                    };
                    if (!string.IsNullOrWhiteSpace(request.ImageData))
                    {
                        companyProfile.LogoUrl = logoUrl;
                    }
                    _companyProfileRepository.Add(companyProfile);
                }
            }
            else
            {
                companyProfile = _mapper.Map<CompanyProfile>(request);
                if (!string.IsNullOrWhiteSpace(request.ImageData))
                {
                    companyProfile.LogoUrl = logoUrl;
                }
                _companyProfileRepository.Add(companyProfile);
            }

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while Updating Company Profile.");
                return ServiceResponse<CompanyProfileDto>.Return500();
            }

            if (!string.IsNullOrWhiteSpace(request.ImageData))
            {
                if (!string.IsNullOrWhiteSpace(oldLogoUrl))
                {
                    _fileStorageService.DeleteFile(Path.Combine(_pathHelper.CompanyLogo, oldLogoUrl));
                }

                await _fileStorageService.SaveFileAsync(_pathHelper.CompanyLogo, request.ImageData, companyProfile.LogoUrl);
            }
            var result = _mapper.Map<CompanyProfileDto>(companyProfile);
            if (!string.IsNullOrWhiteSpace(result.LogoUrl))
            {
                 var physicalPath = _fileStorageService.GetPhysicalPath(Path.Combine(_pathHelper.CompanyLogo, result.LogoUrl));
                 if (File.Exists(physicalPath))
                 {
                     result.LogoUrl = Path.Combine(_pathHelper.CompanyLogo, result.LogoUrl).Replace("\\", "/");
                 }
                 else
                 {
                     result.LogoUrl = null;
                 }
            }

            result.Languages = await _mediator.Send(new GetAllLanguageCommand());
            var locations = await _locationRepository.All.ToListAsync();
            result.Locations = _mapper.Map<List<LocationDto>>(locations);
            var financialYears = await _financialYearRepository.All.ToListAsync();
            result.FinancialYears = _mapper.Map<List<FinancialYearDto>>(financialYears);
            return ServiceResponse<CompanyProfileDto>.ReturnResultWith200(result);
        }
    }
}
