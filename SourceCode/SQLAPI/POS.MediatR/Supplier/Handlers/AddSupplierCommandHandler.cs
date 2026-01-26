using AutoMapper;
using POS.Common.UnitOfWork;
using POS.Data;
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
using System.Threading;

namespace POS.MediatR.Handlers
{
    public class AddSupplierCommandHandler : IRequestHandler<AddSupplierCommand, ServiceResponse<SupplierDto>>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<AddSupplierCommandHandler> _logger;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _webHostEnvironment;

        private readonly PathHelper _pathHelper;
        private readonly IFileStorageService _fileStorageService;

        public AddSupplierCommandHandler(ISupplierRepository supplierRepository,
            ILogger<AddSupplierCommandHandler> logger,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
              IWebHostEnvironment webHostEnvironment,
              PathHelper pathHelper,
              IFileStorageService fileStorageService)
        {
            _supplierRepository = supplierRepository;
            _uow = uow;
            _logger = logger;
            _mapper = mapper;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _fileStorageService = fileStorageService;
        }

        public async Task<ServiceResponse<SupplierDto>> Handle(AddSupplierCommand request, CancellationToken cancellationToken)
        {
            var entity = await _supplierRepository.FindBy(c => c.SupplierName == request.SupplierName).FirstOrDefaultAsync();
            if (entity != null)
            {
                _logger.LogError("Supplier Name is already exist.");
                return ServiceResponse<SupplierDto>.Return422("Supplier Name is already exist.");
            }
            if (request.IsImageUpload && !string.IsNullOrEmpty(request.Logo))
            {
                var imageUrl = Guid.NewGuid().ToString() + ".png";
                request.Url = imageUrl;
            }
            entity = _mapper.Map<POS.Data.Supplier>(request);
            _supplierRepository.Add(entity);

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error to Save Supplier");
                return ServiceResponse<SupplierDto>.Return500();
            }

            if (request.IsImageUpload && !string.IsNullOrWhiteSpace(entity.Url))
            {
                await _fileStorageService.SaveFileAsync(_pathHelper.SupplierImagePath, request.Logo, entity.Url);
            }
            return ServiceResponse<SupplierDto>.ReturnResultWith200(_mapper.Map<SupplierDto>(entity));
        }
    }
}
