using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Domain;
using POS.Helper;
using POS.Repository.Accouting;

namespace POS.MediatR.Accouting
{
    public class UpdateFinancialYearCommandHandler(
          IFinancialYearRepository _financialYearRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<AddFinancialYearCommandHandler> _logger,
        IMapper _mapper) : IRequestHandler<UpdateFinancialYearCommand, ServiceResponse<FinancialYearDto>>
    {
        public async Task<ServiceResponse<FinancialYearDto>> Handle(UpdateFinancialYearCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var entityExist = await _financialYearRepository.All.Where(c => c.Id == request.Id).FirstOrDefaultAsync();
                if (entityExist == null)
                {
                    return ServiceResponse<FinancialYearDto>.Return404("Financial year not found");
                }
                if(entityExist.IsClosed)
                {
                    return ServiceResponse<FinancialYearDto>.Return409("this year has been Close already");
                }
                _mapper.Map(request, entityExist);
                _financialYearRepository.Update(entityExist);
                if (await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<FinancialYearDto>.Return500();
                }
                var financialYearDto = _mapper.Map<FinancialYearDto>(entityExist);
                return ServiceResponse<FinancialYearDto>.ReturnResultWith201(financialYearDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while updating FinancialYear");
                return ServiceResponse<FinancialYearDto>.Return500("error while updating FinancialYear");
            }
        }
    }
}
