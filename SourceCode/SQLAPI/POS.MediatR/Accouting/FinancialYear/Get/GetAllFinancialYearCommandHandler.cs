using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetAllFinancialYearCommandHandler(
        IFinancialYearRepository _financialYearRepository,
        ILogger<GetAllFinancialYearCommandHandler> _logger,
        IUserRepository _userRepository) : IRequestHandler<GetAllFinancialYearCommand, ServiceResponse<List<FinancialYearDto>>>
    {
        public async Task<ServiceResponse<List<FinancialYearDto>>> Handle(GetAllFinancialYearCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financiaYears = await _financialYearRepository.All.ToListAsync(cancellationToken);
                var users=await _userRepository.All.Where(c=> financiaYears.Select(x => x.ClosedBy).Contains(c.Id)).ToListAsync(cancellationToken);
                var financialYearDtos = financiaYears.Select(c => new FinancialYearDto
                {
                    Id = c.Id,
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    ClosedDate = c.ClosedDate,
                    IsClosed = c.IsClosed,
                    ClosedByName= c.ClosedBy != Guid.Empty ? users.Where(u => u.Id == c.ClosedBy).Select(u => (u.FirstName ?? "") + " " + (u.LastName ?? "")) .FirstOrDefault(): string.Empty
                }).OrderByDescending(c=>c.EndDate).ToList();
                return ServiceResponse<List<FinancialYearDto>>.ReturnResultWith200(financialYearDtos);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting financial Year");
                return ServiceResponse<List<FinancialYearDto>>.Return500("error while getting financial Year");
            }
        }
    }
}
