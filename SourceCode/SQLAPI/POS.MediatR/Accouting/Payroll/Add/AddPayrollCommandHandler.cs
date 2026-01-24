using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class AddPayrollCommandHandler(
        IPayrollRepository _payrollRepository,
        IMapper _mapper,
        IUnitOfWork<POSDbContext> _uow,
       ILogger<AddPayrollCommandHandler> _logger,
       PathHelper _pathHelper,
       IWebHostEnvironment _webHostEnvironment,
       IPayrollStrategy _payrollStrategy,
       ITransactionRepository _transactionRepository,
       IFinancialYearRepository _financialYearRepository) : IRequestHandler<AddPayrollCommand, ServiceResponse<PayrollDto>>
    {
        private readonly string _storagePath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.DocumentPath);
        public async Task<ServiceResponse<PayrollDto>> Handle(AddPayrollCommand request, CancellationToken cancellationToken)
        {
            try
            {  //Current financial Year
                var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();

                var entity = _mapper.Map<Payroll>(request);
                if (request.File != null && request.File.Length > 0)
                {
                    string extension = Path.GetExtension(request.File.FileName);
                    string fileName = $"{Guid.NewGuid()}{extension}";

                    if (!Directory.Exists(_storagePath))
                    {
                        Directory.CreateDirectory(_storagePath);
                    }

                    string fullPath = Path.Combine(_storagePath, fileName);
                    using (var stream = new FileStream(fullPath, FileMode.Create))
                    {
                        await request.File.CopyToAsync(stream, cancellationToken);
                    }
                    entity.Attachment = fileName;
                }
                entity.FinancialYearId = financialYearId;
                _payrollRepository.Add(entity);

                try
                {
                    // Payroll accounting
                    var transaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        BranchId = request.BranchId,
                        Narration = "payroll",
                        ReferenceNumber = request.Note,
                        TransactionDate = DateTime.UtcNow,
                        TransactionType = TransactionType.Payroll,
                        TotalAmount = request.TotalSalary,
                        FinancialYearId = financialYearId,
                        TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(TransactionType.Payroll)
                    };

                    transaction.Status = TransactionStatus.Completed;
                    _transactionRepository.Add(transaction);
                    await _payrollStrategy.ProcessPayrollAsync(entity, transaction.Id);
                }
                catch (System.Exception ex)
                {
                    _logger.LogError(ex, "error while saving Accounting");
                }
                if (await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<PayrollDto>.Return500();
                }
                var entityDto = _mapper.Map<PayrollDto>(entity);
                return ServiceResponse<PayrollDto>.ReturnResultWith200(entityDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while Saving Payroll");
                return ServiceResponse<PayrollDto>.Return500("error while Saving Payroll");
            }
        }
    }
}
