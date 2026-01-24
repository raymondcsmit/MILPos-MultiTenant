using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Tax.Commands;
using POS.Repository;
using POS.Repository.Accouting;
using System.Linq;

namespace POS.MediatR.Tax.Handlers
{
    public class AddTaxCommandHandler : IRequestHandler<AddTaxCommand, ServiceResponse<TaxDto>>
    {
        private readonly ITaxRepository _taxRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddTaxCommandHandler> _logger;
        private readonly ILedgerAccountRepository _ledgerAccountRepository;
        public AddTaxCommandHandler(
           ITaxRepository taxRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILedgerAccountRepository ledgerAccountRepository,
            ILogger<AddTaxCommandHandler> logger
            )
        {
            _taxRepository = taxRepository;
            _ledgerAccountRepository = ledgerAccountRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
        }

        public async Task<ServiceResponse<TaxDto>> Handle(AddTaxCommand request, CancellationToken cancellationToken)
        {

            var existingEntity = await _taxRepository.FindBy(c => c.Name == request.Name).FirstOrDefaultAsync();
            if (existingEntity != null)
            {
                _logger.LogError("Tax Already Exist");
                return ServiceResponse<TaxDto>.Return409("Tax Already Exist.");
            }
            var entity = _mapper.Map<POS.Data.Tax>(request);
            entity.Id = Guid.NewGuid();
           
            var taxCount = await _taxRepository.All.Where(c=>!c.IsDeleted).ToListAsync();
            //Input Gst Add Leadger Account
            var inputGST = await _ledgerAccountRepository.FindBy(c => c.AccountCode == "1150").FirstOrDefaultAsync();
            if (inputGST != null)
            {
                var inputGSTAccountCode = inputGST.AccountCode;
                if (int.TryParse(inputGSTAccountCode, out int accountCodeNumber))
                {
                    accountCodeNumber += (taxCount.Count + 1);
                    entity.InPutAccountCode = accountCodeNumber.ToString();
                }
                var ledgerAccount = new LedgerAccount()
                {
                    AccountCode = accountCodeNumber.ToString(),
                    AccountName = $"{inputGST.AccountName} - {entity.Name}",
                    AccountType = AccountType.Asset,
                    AccountGroup = AccountGroup.CurrentAsset,
                    ParentAccountId = inputGST.Id,
                    IsActive = true,
                };
                _ledgerAccountRepository.Add(ledgerAccount);
               
            }
            //OutPut Gst Add Leadger Account
            var outputGST = await _ledgerAccountRepository.FindBy(c => c.AccountCode == "2150").FirstOrDefaultAsync();
            if (outputGST != null)
            {
                var outputGSTAccountCode = outputGST.AccountCode;
                if (int.TryParse(outputGSTAccountCode, out int accountCodeNumber))
                {
                    accountCodeNumber += (taxCount.Count + 1);
                    entity.OutPutAccountCode = accountCodeNumber.ToString();
                }
                var ledgerAccount = new LedgerAccount()
                {
                    AccountCode = accountCodeNumber.ToString(),
                    AccountName = $"{outputGST.AccountName} - {entity.Name}",
                    AccountType = AccountType.Liability,
                    AccountGroup = AccountGroup.CurrentLiability,
                    ParentAccountId = outputGST.Id,
                    IsActive = true,
                };
                _ledgerAccountRepository.Add(ledgerAccount);
            }
            _taxRepository.Add(entity);
            if (await _uow.SaveAsync() <= 0)
            {

                _logger.LogError("Save Page have Error");
                return ServiceResponse<TaxDto>.Return500();
            }
            return ServiceResponse<TaxDto>.ReturnResultWith200(_mapper.Map<TaxDto>(entity));
        }
    }
}
