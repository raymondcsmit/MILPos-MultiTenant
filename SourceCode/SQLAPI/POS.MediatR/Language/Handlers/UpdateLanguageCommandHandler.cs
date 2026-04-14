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
using PathHelper = POS.Helper.PathHelper;
using System.Threading;
using System.IO;

namespace POS.MediatR.Language.Handlers
{
    public class UpdateLanguageCommandHandler(
        IWebHostEnvironment _webHostEnvironment,
        PathHelper _pathHelper,
        ILanguageRepository _languageRepository,
        ILogger<UpdateLanguageCommand> _logger,
        IUnitOfWork<POSDbContext> _uow,
        IMapper _mapper,
        IFileStorageService _fileStorageService) : IRequestHandler<UpdateLanguageCommand, ServiceResponse<LanguageDto>>
    {
        public async Task<ServiceResponse<LanguageDto>> Handle(UpdateLanguageCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _languageRepository.FindBy(c => c.Name == request.Name && c.Id != request.Id)
             .FirstOrDefaultAsync();
            if (entityExist != null)
            {
                _logger.LogError("Data Already Exist.");
                return ServiceResponse<LanguageDto>.Return409("Data Already Exist.");
            }
            var jsonBytes = Encoding.UTF8.GetBytes(request.Codes);
            await _fileStorageService.SaveFileAsync(_pathHelper.LanguagePath, jsonBytes, request.Code + ".json");
            entityExist = await _languageRepository.FindBy(v => v.Id == request.Id).FirstOrDefaultAsync();
            entityExist.Name = request.Name;
            entityExist.Id = request.Id;
            entityExist.Code = request.Code;
            entityExist.Isrtl = request.Isrtl;
            entityExist.Order = request.Order;
            var oldImageUrl = entityExist.ImageUrl;
            if (request.IsLanguageImageUpload)
            {
                if (!string.IsNullOrEmpty(request.LanguageImgSrc))
                {
                    entityExist.ImageUrl = $"{Guid.NewGuid()}.png";
                }
                else
                {
                    entityExist.ImageUrl = "";
                }
            }
            _languageRepository.Update(entityExist);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<LanguageDto>.Return500();
            }

            if (request.IsLanguageImageUpload)
            {
                if (!string.IsNullOrWhiteSpace(oldImageUrl))
                {
                    _fileStorageService.DeleteFile(Path.Combine(_pathHelper.LanguageImagePath, oldImageUrl));
                }

                // save new file
                if (!string.IsNullOrWhiteSpace(request.LanguageImgSrc))
                {
                    await _fileStorageService.SaveFileAsync(_pathHelper.LanguageImagePath, request.LanguageImgSrc, entityExist.ImageUrl);
                }
            }
            var result = _mapper.Map<LanguageDto>(entityExist);
            if (!string.IsNullOrWhiteSpace(result.ImageUrl))
            {
                 var physicalPath = _fileStorageService.GetPhysicalPath(Path.Combine(_pathHelper.LanguageImagePath, result.ImageUrl));
                 if (File.Exists(physicalPath))
                 {
                     result.ImageUrl = Path.Combine(_pathHelper.LanguageImagePath, result.ImageUrl).Replace("\\", "/");
                 }
                 else
                 {
                     result.ImageUrl = null;
                 }
            }
            return ServiceResponse<LanguageDto>.ReturnResultWith200(result);
        }
    }
}
