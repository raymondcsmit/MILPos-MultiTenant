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

namespace POS.MediatR.Language.Handlers
{
    public class AddLanguageCommandHandler(IUnitOfWork<POSDbContext> _uow, PathHelper _pathHelper,IWebHostEnvironment _webHostEnvironment,ILanguageRepository _languageRepository, ILogger<AddLanguageCommand> _logger, IMapper _mapper) : IRequestHandler<AddLanguageCommand, ServiceResponse<LanguageDto>>
    {
        public async Task<ServiceResponse<LanguageDto>> Handle(AddLanguageCommand request, CancellationToken cancellationToken)
        {
            var existingEntity = await _languageRepository.FindBy(c => c.Name == request.Name && c.Code == request.Code).FirstOrDefaultAsync();
            if (existingEntity != null)
            {
                _logger.LogError("Language Already Exist");
                return ServiceResponse<LanguageDto>.Return409("Data Already Exist.");
            }
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath,_pathHelper.LanguagePath, request.Code + ".json");
            await System.IO.File.WriteAllTextAsync(filePath, request.Codes);
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
                var pathToSave = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.LanguageImagePath);
                if (!Directory.Exists(pathToSave))
                {
                    Directory.CreateDirectory(pathToSave);
                }
                await FileData.SaveFile(Path.Combine(pathToSave, entity.ImageUrl), request.LanguageImgSrc);
            }
            var entityToReturn = _mapper.Map<LanguageDto>(entity);
            if (!string.IsNullOrWhiteSpace(request.LanguageImgSrc))
            {
                entityToReturn.ImageUrl = Path.Combine(_pathHelper.LanguageImagePath, entityToReturn.ImageUrl);
            }
            return ServiceResponse<LanguageDto>.ReturnResultWith200(entityToReturn);
        }
    }
}
