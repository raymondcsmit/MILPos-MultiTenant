using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.Repository.Accouting;

namespace POS.MediatR.Accouting;
public class DeleteFinancialYearCommandHandler(IUnitOfWork<POSDbContext> _uow, IFinancialYearRepository financialYearRepository, ILogger<DeleteFinancialYearCommandHandler> _logger) : IRequestHandler<DeleteFinancialYearCommand, ServiceResponse<bool>>
{
    public async Task<ServiceResponse<bool>> Handle(DeleteFinancialYearCommand request, CancellationToken cancellationToken)
    {
        var entityExist = await financialYearRepository.FindAsync(request.Id);
        if (entityExist == null)
        {
            _logger.LogError("Financial Year Does not exists");
            return ServiceResponse<bool>.Return404("Financial Year  Does not exists");
        }
        financialYearRepository.Remove(entityExist);
        if (await _uow.SaveAsync() <= 0)
        {
            _logger.LogError("Error While saving Financial Year.");
            return ServiceResponse<bool>.Return500();
        }

        return ServiceResponse<bool>.ReturnSuccess();
    }
}
