using System.IO;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.Language.Commands;
using POS.Repository;
using PathHelper = POS.Helper.PathHelper;

namespace POS.MediatR.Language.Handlers
{
    public class GetLanguageCommandHandler (IWebHostEnvironment _webHostEnvironment,PathHelper _pathHelper,ILanguageRepository _languageRepository,IMapper _mapper,ILogger<DeleteLanguageCommand> _logger): IRequestHandler<GetLanguageCommand, ServiceResponse<LanguageDto>>
    {
        public async Task<ServiceResponse<LanguageDto>> Handle(GetLanguageCommand request, CancellationToken cancellationToken)
        {
            var entity = await _languageRepository.FindBy(c => c.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("Data is not exists");
                return ServiceResponse<LanguageDto>.Return404();
            }
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath,_pathHelper.LanguagePath, entity.Code + ".json");
            if (!System.IO.File.Exists(filePath))
            {
                return ServiceResponse<LanguageDto>.Return404();
            }
            var fileContent = await System.IO.File.ReadAllTextAsync(filePath);
            var entityDto = _mapper.Map<LanguageDto>(entity);
            entityDto.Codes = fileContent;
            entityDto.ImageUrl = !string.IsNullOrWhiteSpace(entityDto.ImageUrl) ? Path.Combine(_pathHelper.LanguageImagePath, entityDto.ImageUrl) : "";
            return ServiceResponse<LanguageDto>.ReturnResultWith200(entityDto);
        }
    }
}
