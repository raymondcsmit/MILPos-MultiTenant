using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
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

namespace POS.MediatR.Language.Handlers
{
    public class UpdateLanguageCommandHandler(IWebHostEnvironment _webHostEnvironment,PathHelper _pathHelper,ILanguageRepository _languageRepository, ILogger<UpdateLanguageCommand> _logger, IUnitOfWork<POSDbContext> _uow, IMapper _mapper) : IRequestHandler<UpdateLanguageCommand, ServiceResponse<LanguageDto>>
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
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.LanguagePath, request.Code + ".json");
            await System.IO.File.WriteAllTextAsync(filePath, request.Codes);
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
                string contentRootPath = _webHostEnvironment.WebRootPath;
                // delete old file
                if (!string.IsNullOrWhiteSpace(oldImageUrl)
                    && File.Exists(Path.Combine(contentRootPath, _pathHelper.LanguageImagePath, oldImageUrl)))
                {
                    FileData.DeleteFile(Path.Combine(contentRootPath, _pathHelper.LanguageImagePath, oldImageUrl));
                }

                // save new file
                if (!string.IsNullOrWhiteSpace(request.LanguageImgSrc))
                {
                    var pathToSave = Path.Combine(contentRootPath, _pathHelper.LanguageImagePath);
                    if (!Directory.Exists(pathToSave))
                    {
                        Directory.CreateDirectory(pathToSave);
                    }
                    await FileData.SaveFile(Path.Combine(pathToSave, entityExist.ImageUrl), request.LanguageImgSrc);
                }
            }
            var result = _mapper.Map<LanguageDto>(entityExist);
            if (!string.IsNullOrWhiteSpace(result.ImageUrl))
            {
                result.ImageUrl = Path.Combine(_pathHelper.LanguageImagePath, result.ImageUrl);
            }
            return ServiceResponse<LanguageDto>.ReturnResultWith200(result);
        }
    }
}
