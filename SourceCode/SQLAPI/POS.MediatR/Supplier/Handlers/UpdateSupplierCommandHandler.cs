using AutoMapper;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using POS.Common.Services;
using System.IO;

namespace POS.MediatR.Handlers
{
    public class UpdateSupplierCommandHandler : IRequestHandler<UpdateSupplierCommand, ServiceResponse<SupplierDto>>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<UpdateSupplierCommandHandler> _logger;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _webHostEnvironment;

        private readonly PathHelper _pathHelper;
        private readonly IFileStorageService _fileStorageService;

        public UpdateSupplierCommandHandler(ISupplierRepository supplierRepository,
            ILogger<UpdateSupplierCommandHandler> logger,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
              IWebHostEnvironment webHostEnvironment,
              PathHelper pathHelper,
              IFileStorageService fileStorageService
            )
        {
            _supplierRepository = supplierRepository;
            _uow = uow;
            _logger = logger;
            _mapper = mapper;
            _webHostEnvironment = webHostEnvironment;

            _pathHelper = pathHelper;
            _fileStorageService = fileStorageService;
        }

        public async Task<ServiceResponse<SupplierDto>> Handle(UpdateSupplierCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _supplierRepository.FindBy(c => c.Id != request.Id && c.SupplierName == request.SupplierName.Trim())
                .FirstOrDefaultAsync();
            if (entityExist != null)
            {
                _logger.LogError("Supplier Name Already Exist for another supplier.");
                return ServiceResponse<SupplierDto>.Return422("Supplier Name Already Exist for another supplier.");
            }

            var entity = await _supplierRepository
              .AllIncluding(cs => cs.ShippingAddress, b => b.BillingAddress)
              .FirstOrDefaultAsync(c => c.Id == request.Id);

            if (request.IsImageUpload)
            {
                if (!string.IsNullOrEmpty(request.Logo))
                {
                    request.Url = Guid.NewGuid().ToString() + ".png";
                }
                else
                {
                    request.Url = "";
                }
            }
            else
            {
                request.Url = entity.Url;
            }

            var oldImageUrl = entity.Url;

            entity = _mapper.Map(request, entity);
            _supplierRepository.Update(entity);
            if (_uow.Save() <= 0)
            {
                _logger.LogError("Error to Update Supplier");
                return ServiceResponse<SupplierDto>.Return500();
            }

            if (request.IsImageUpload)
            {
                // delete old file
                if (!string.IsNullOrWhiteSpace(oldImageUrl))
                {
                    _fileStorageService.DeleteFile(Path.Combine(_pathHelper.SupplierImagePath, oldImageUrl));
                }
                // save new file
                if (!string.IsNullOrWhiteSpace(request.Logo))
                {
                    await _fileStorageService.SaveFileAsync(_pathHelper.SupplierImagePath, request.Logo, entity.Url);
                }
            }
            return ServiceResponse<SupplierDto>.ReturnResultWith200(_mapper.Map<SupplierDto>(entity));
        }
    }
}
