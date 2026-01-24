using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.Language.Commands;
using POS.Repository;

namespace POS.MediatR.Language.Handlers
{
    public class GetAllLanguageCommandHandler(ILanguageRepository _languageRepository, PathHelper _pathHelper) : IRequestHandler<GetAllLanguageCommand, List<LanguageDto>>
    {
        public async Task<List<LanguageDto>> Handle(GetAllLanguageCommand request, CancellationToken cancellationToken)
        {
            var entities = await _languageRepository.All
                .Select(c => new LanguageDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    ImageUrl = !string.IsNullOrWhiteSpace(c.ImageUrl) ? Path.Combine(_pathHelper.LanguageImagePath, c.ImageUrl) : "",
                    Code = c.Code,
                    Order = c.Order,
                    Isrtl = c.Isrtl
                })
                .OrderBy(c => c.Order)
                .ToListAsync();
            return entities;
        }
    }
}
