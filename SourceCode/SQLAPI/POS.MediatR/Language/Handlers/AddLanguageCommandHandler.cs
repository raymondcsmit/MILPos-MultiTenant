using System;
using System.Threading;
using System.Threading.Tasks;
using POS.Common.Services;
using System.Text;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Language.Commands;
using POS.Repository;
using System.Threading;
using System.IO;

namespace POS.MediatR.Language.Handlers
{
    public class AddLanguageCommandHandler(
        IUnitOfWork<POSDbContext> _uow,
        PathHelper _pathHelper,
        IWebHostEnvironment _webHostEnvironment,
        ILanguageRepository _languageRepository,
        ILogger<AddLanguageCommand> _logger,
        IMapper _mapper,
        IFileStorageService _fileStorageService) : IRequestHandler<AddLanguageCommand, ServiceResponse<LanguageDto>>
    {
        public async Task<ServiceResponse<LanguageDto>> Handle(AddLanguageCommand request, CancellationToken cancellationToken)
        {
            var existingEntity = await _languageRepository.FindBy(c => c.Name == request.Name && c.Code == request.Code).FirstOrDefaultAsync();
            if (existingEntity != null)
            {
                _logger.LogError("Language Already Exist");
                return ServiceResponse<LanguageDto>.Return409("Data Already Exist.");
            }
            var jsonBytes = Encoding.UTF8.GetBytes(request.Codes);
            await _fileStorageService.SaveFileAsync(_pathHelper.LanguagePath, jsonBytes, request.Code + ".json");
            var entity = _mapper.Map<POS.Data.Entities.Language>(request); // This line will now correctly reference the Data entity

            if (!string.IsNullOrWhiteSpace(request.LanguageImgSrc))
            {
                entity.ImageUrl = Guid.NewGuid().ToString() + ".png";
            }

            _languageRepository.Add(entity);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Save Page have Error");
                return ServiceResponse<LanguageDto>.Return500();
            }

            if (!string.IsNullOrWhiteSpace(request.LanguageImgSrc))
            {
                await _fileStorageService.SaveFileAsync(_pathHelper.LanguageImagePath, request.LanguageImgSrc, entity.ImageUrl);
            }
            var entityToReturn = _mapper.Map<LanguageDto>(entity);
            if (!string.IsNullOrWhiteSpace(request.LanguageImgSrc))
            {
                 var physicalPath = _fileStorageService.GetPhysicalPath(Path.Combine(_pathHelper.LanguageImagePath, entityToReturn.ImageUrl));
                 if (File.Exists(physicalPath))
                 {
                     entityToReturn.ImageUrl = Path.Combine(_pathHelper.LanguageImagePath, entityToReturn.ImageUrl).Replace("\\", "/");
                 }
                 else
                 {
                     entityToReturn.ImageUrl = null;
                 }
            }
            return ServiceResponse<LanguageDto>.ReturnResultWith200(entityToReturn);
        }
    }
}
