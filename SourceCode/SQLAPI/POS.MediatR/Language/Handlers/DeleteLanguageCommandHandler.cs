using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Language.Commands;
using POS.Repository;
using PathHelper = POS.Helper.PathHelper;

namespace POS.MediatR.Language.Handlers
{
    public class DeleteLanguageCommandHandler(IWebHostEnvironment _webHostEnvironment,PathHelper _pathHelper, ILanguageRepository _languageRepository, IUnitOfWork<POSDbContext> _uow) : IRequestHandler<DeleteLanguageCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(DeleteLanguageCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _languageRepository.FindAsync(request.Id);
            if (entityExist == null)
            {
                return ServiceResponse<bool>.Return404();
            }
            _languageRepository.Delete(request.Id);
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.LanguagePath, entityExist.Code + ".json");
            if (File.Exists(filePath))
                System.IO.File.Delete(filePath);
            var languageImage = Path.Combine(_pathHelper.LanguageImagePath, entityExist.ImageUrl);
            if (File.Exists(languageImage))
            {
                File.Delete(languageImage);
            }
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<bool>.Return500();
            }
            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
