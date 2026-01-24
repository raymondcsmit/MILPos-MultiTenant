using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Tax.Commands;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tax.Handlers
{
   public class UpdateTaxCommandHandler : IRequestHandler<UpdateTaxCommand, ServiceResponse<TaxDto>>
    {
        private readonly ITaxRepository _taxRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdateTaxCommandHandler> _logger;
        public UpdateTaxCommandHandler(
           ITaxRepository taxRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<UpdateTaxCommandHandler> logger
            )
        {
            _taxRepository = taxRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
        }

        public async Task<ServiceResponse<TaxDto>> Handle(UpdateTaxCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _taxRepository.FindBy(c => c.Name == request.Name && c.Id != request.Id)
             .FirstOrDefaultAsync();
            if (entityExist != null)
            {
                _logger.LogError("Tax Already Exist.");
                return ServiceResponse<TaxDto>.Return409("Tax Already Exist.");
            }
            entityExist = await _taxRepository.FindBy(v => v.Id == request.Id).FirstOrDefaultAsync();
            entityExist.Name = request.Name;
            entityExist.Percentage=request.Percentage;
            var entityDto = _mapper.Map<TaxDto>(entityExist);
            _taxRepository.Update(entityExist);
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<TaxDto>.Return500();
            }
            return ServiceResponse<TaxDto>.ReturnResultWith200(entityDto);
        }
    }
}
