using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class AddFinancialYearCommandHandler(
        IFinancialYearRepository _financialYearRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<AddFinancialYearCommandHandler> _logger,
        IMapper _mapper) : IRequestHandler<AddFinancialYearCommand, ServiceResponse<FinancialYearDto>>
    {
        public async Task<ServiceResponse<FinancialYearDto>> Handle(AddFinancialYearCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financialYear = _mapper.Map<FinancialYear>(request);
                _financialYearRepository.Add(financialYear);
                if(await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<FinancialYearDto>.Return500();
                }
                var financialYearDto = _mapper.Map<FinancialYearDto>(financialYear);
                return ServiceResponse<FinancialYearDto>.ReturnResultWith201(financialYearDto);
            }
            catch (System.Exception ex) 
            {
                _logger.LogError(ex, "error while saving FinancialYear");
                return ServiceResponse<FinancialYearDto>.Return500("error while saving FinancialYear");
            }
        }
    }
}
