using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Brand.Command;
using POS.MediatR.Tax.Commands;
using POS.Repository;
using System;
using System.Threading.Tasks;
using POS.Common.Services;
using System.Threading;
using System.IO;

namespace POS.MediatR.Brand.Handler
{
    public class UpdateBrandCommandHandler
        : IRequestHandler<UpdateBrandCommand, ServiceResponse<BrandDto>>
    {
        private readonly IBrandRepository _brandRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<UpdateBrandCommandHandler> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        private readonly IMapper _mapper;
        private readonly IFileStorageService _fileStorageService;

        public UpdateBrandCommandHandler(
           IBrandRepository brandRepository,
            IUnitOfWork<POSDbContext> uow,
            ILogger<UpdateBrandCommandHandler> logger,
            IWebHostEnvironment webHostEnvironment,
            PathHelper pathHelper,
            IMapper mapper,
            IFileStorageService fileStorageService
            )
        {
            _brandRepository = brandRepository;
            _uow = uow;
            _logger = logger;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _mapper = mapper;
            _fileStorageService = fileStorageService;
        }

        public async Task<ServiceResponse<BrandDto>> Handle(UpdateBrandCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _brandRepository.FindBy(c => c.Name == request.Name && c.Id != request.Id)
             .FirstOrDefaultAsync();
            if (entityExist != null)
            {
                _logger.LogError("Brand Already Exist.");
                return ServiceResponse<BrandDto>.Return409("Brand Already Exist.");
            }
            entityExist = await _brandRepository.FindBy(v => v.Id == request.Id).FirstOrDefaultAsync();
            entityExist.Name = request.Name;
            var oldImageUrl = entityExist.ImageUrl;
            if (request.IsImageChanged)
            {
                if (!string.IsNullOrEmpty(request.ImageUrlData))
                {
                    entityExist.ImageUrl = $"{Guid.NewGuid()}.png";
                }
                else
                {
                    entityExist.ImageUrl = "";
                }
            }
            _brandRepository.Update(entityExist);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<BrandDto>.Return500();
            }

            if (request.IsImageChanged)
            {
                // delete old file
                if (!string.IsNullOrWhiteSpace(oldImageUrl))
                {
                    _fileStorageService.DeleteFile(Path.Combine(_pathHelper.BrandImagePath, oldImageUrl));
                }

                // save new file
                if (!string.IsNullOrWhiteSpace(request.ImageUrlData))
                {
                    await _fileStorageService.SaveFileAsync(_pathHelper.BrandImagePath, request.ImageUrlData, entityExist.ImageUrl);
                }
            }
            var result = _mapper.Map<BrandDto>(entityExist);
            if (!string.IsNullOrWhiteSpace(result.ImageUrl))
            {
                 var physicalPath = _fileStorageService.GetPhysicalPath(Path.Combine(_pathHelper.BrandImagePath, result.ImageUrl));
                 if (File.Exists(physicalPath))
                 {
                     result.ImageUrl = Path.Combine(_pathHelper.BrandImagePath, result.ImageUrl).Replace("\\", "/");
                 }
                 else
                 {
                     result.ImageUrl = null;
                 }
            }
            return ServiceResponse<BrandDto>.ReturnResultWith200(result);
        }
    }
}
