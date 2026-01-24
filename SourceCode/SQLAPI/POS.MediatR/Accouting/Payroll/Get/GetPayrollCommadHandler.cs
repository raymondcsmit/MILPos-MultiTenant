using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
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
    public class GetPayrollCommadHandler(
        IPayrollRepository _payrollRepository,
        IMapper _mapper,
        ILogger<GetPayrollCommadHandler> _logger) : IRequestHandler<GetPayrollCommad, ServiceResponse<PayrollDto>>
    {
        public async Task<ServiceResponse<PayrollDto>> Handle(GetPayrollCommad request, CancellationToken cancellationToken)
        {
            try
            {
                var entity = await _payrollRepository.All.Where(c => c.Id == request.Id)
                    .Include(c => c.Location)
                    .Include(c => c.Employee).FirstOrDefaultAsync(cancellationToken);
                if (entity == null)
                {
                    return ServiceResponse<PayrollDto>.Return404("payroll not found");
                }
                var entityDto = _mapper.Map<PayrollDto>(entity);
                entityDto.EmployeeName = entity.Employee != null ? entity.Employee.FirstName + " " + entity.Employee.LastName : "";
                entityDto.BranchName = entity.Location != null ? entity.Location.Name : "";
                return ServiceResponse<PayrollDto>.ReturnResultWith200(entityDto);
            }
            catch(System.Exception ex)
            {   
                _logger.LogError(ex,"error while getting payroll");
                return ServiceResponse<PayrollDto>.Return500("error while getting payroll");
            }
        }
    }
}
