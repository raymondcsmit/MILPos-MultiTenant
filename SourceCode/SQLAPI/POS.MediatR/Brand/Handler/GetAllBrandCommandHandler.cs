using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.Brand.Command;
using POS.Repository;
using POS.Domain;
using POS.Common.DapperInfrastructure;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using SqlKata;
using SqlKata.Compilers;

namespace POS.MediatR.Brand.Handler
{
    public class GetAllBrandCommandHandler : IRequestHandler<GetAllBrandCommand, List<BrandDto>>
    {
        private readonly IBrandRepository _brandRepository;
        private readonly IMapper _mapper;
        private readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetAllBrandCommandHandler> _logger;
        private readonly Compiler _compiler;

        public GetAllBrandCommandHandler(
            IBrandRepository brandRepository,
            IMapper mapper,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllBrandCommandHandler> logger,
            Compiler compiler)
        {
            _brandRepository = brandRepository;
            _mapper = mapper;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
            _compiler = compiler;
        }

        public async Task<List<BrandDto>> Handle(GetAllBrandCommand request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetAllBrandCommandHandler", true);

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var brandTable = _sqlAccessor.GetTableName<POS.Data.Brand>();

                    var query = new Query(brandTable)
                        .Select("Id", "Name", "ImageUrl")
                        .Where("TenantId", tenantId)
                        .Where("IsDeleted", false)
                        .OrderBy("Name");

                    var compiled = _compiler.Compile(query);

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var brands = await connection.QueryAsync<BrandDto>(compiled.Sql, compiled.NamedBindings, currentTransaction, commandTimeout: 30);

                    // Client-side evaluation for Path.Combine to avoid ORM evaluation overhead
                    foreach (var brand in brands)
                    {
                        brand.ImageUrl = !string.IsNullOrWhiteSpace(brand.ImageUrl) 
                            ? Path.Combine(_pathHelper.BrandImagePath, brand.ImageUrl) 
                            : "";
                    }

                    return brands.ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetAllBrandCommandHandler. Falling back to EF Core.");
                }
            }

            var entities = await _brandRepository.All.AsNoTracking()
                .Select(c => new BrandDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    ImageUrl = c.ImageUrl // Fetch raw from DB first to prevent Client-Side Evaluation
                }).ToListAsync(cancellationToken);

            foreach (var entity in entities)
            {
                entity.ImageUrl = !string.IsNullOrWhiteSpace(entity.ImageUrl) 
                    ? Path.Combine(_pathHelper.BrandImagePath, entity.ImageUrl) 
                    : "";
            }

            return entities;
        }
    }
}
