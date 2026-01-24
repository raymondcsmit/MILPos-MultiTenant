using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting;
public class GetFinancialYearCommandHandler(IFinancialYearRepository financialYearRepository, IMapper _mapper, ILogger<GetFinancialYearCommandHandler> _logger,IUserRepository _userRepository) : IRequestHandler<GetFinancialYearCommand, ServiceResponse<FinancialYearDto>>
{
    public async Task<ServiceResponse<FinancialYearDto>> Handle(GetFinancialYearCommand request, CancellationToken cancellationToken)
    {
        var financialYear = await financialYearRepository
        .FindBy(c => c.Id == request.Id)
        .FirstOrDefaultAsync(cancellationToken);

        if (financialYear == null)
        {
            _logger.LogError("Financial Year does not exist");
            return ServiceResponse<FinancialYearDto>.Return404();
        }

        string closedByName = string.Empty;
        if (financialYear.ClosedBy != Guid.Empty)
        {
            var user = await _userRepository.All
                .Where(u => u.Id == financialYear.ClosedBy)
                .Select(u => (u.FirstName ?? "") + " " + (u.LastName ?? ""))
                .FirstOrDefaultAsync(cancellationToken);

            closedByName = user ?? string.Empty;
        }
        var entityDto = new FinancialYearDto
        {
            Id = financialYear.Id,
            StartDate = financialYear.StartDate,
            EndDate = financialYear.EndDate,
            ClosedDate = financialYear.ClosedDate,
            IsClosed = financialYear.IsClosed,
            ClosedByName = closedByName
        };

        return ServiceResponse<FinancialYearDto>.ReturnResultWith200(entityDto);

    }
}
