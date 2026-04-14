using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using System.Threading;
using System.Threading.Tasks;
using POS.Common.DapperInfrastructure;
using POS.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using System.Text;
using Dapper;
using System.Linq;
using System;
using SqlKata;
using SqlKata.Compilers;

namespace POS.MediatR.Handlers
{
    public class GetAllSupplierQueryHandler : IRequestHandler<GetAllSupplierQuery, SupplierList>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetAllSupplierQueryHandler> _logger;
        private readonly Compiler _compiler;

        public GetAllSupplierQueryHandler(
            ISupplierRepository supplierRepository,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllSupplierQueryHandler> logger,
            Compiler compiler)
        {
            _supplierRepository = supplierRepository;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
            _compiler = compiler;
        }

        public async Task<SupplierList> Handle(GetAllSupplierQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetAllSupplierQueryHandler", true);
            var resource = request.SupplierResource;

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var supplierTable = _sqlAccessor.GetTableName<POS.Data.Supplier>();

                    var query = new Query(supplierTable)
                        .Where("TenantId", tenantId)
                        .Where("IsDeleted", false);

                    if (resource.Id != null)
                    {
                        query.Where("Id", resource.Id);
                    }

                    if (!string.IsNullOrWhiteSpace(resource.SupplierName))
                    {
                        query.WhereRaw(@"LOWER(""SupplierName"") LIKE ?", $"{resource.SupplierName.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.MobileNo))
                    {
                        var pattern = $"%{resource.MobileNo.Trim().ToLowerInvariant()}%";
                        query.Where(q => q
                            .WhereRaw(@"(""MobileNo"" IS NOT NULL AND LOWER(""MobileNo"") LIKE ?)", pattern)
                            .OrWhereRaw(@"(""PhoneNo"" IS NOT NULL AND LOWER(""PhoneNo"") LIKE ?)", pattern));
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Email))
                    {
                        query.WhereRaw(@"LOWER(""Email"") LIKE ?", $"{resource.Email.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Website))
                    {
                        query.WhereRaw(@"LOWER(""Website"") LIKE ?", $"%{resource.Website.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.SearchQuery))
                    {
                        var searchPattern = $"%{resource.SearchQuery.Trim().ToLowerInvariant()}%";
                        query.Where(q => q
                            .WhereRaw(@"LOWER(""SupplierName"") LIKE ?", searchPattern)
                            .OrWhereRaw(@"LOWER(""MobileNo"") LIKE ?", searchPattern)
                            .OrWhereRaw(@"(""PhoneNo"" IS NOT NULL AND LOWER(""PhoneNo"") LIKE ?)", searchPattern)
                        );
                    }

                    var countQuery = query.Clone().AsCount();

                    var dataQuery = query.Clone()
                        .Select("Id", "SupplierName", "Email", "ContactPerson", "MobileNo", "PhoneNo", "Website", "Description", "Fax", "BillingAddressId")
                        .Limit(resource.PageSize)
                        .Offset(resource.Skip);

                    if (!string.IsNullOrWhiteSpace(resource.OrderBy))
                    {
                        var sort = resource.OrderBy.ToLower();
                        if (sort.Contains("suppliername")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("SupplierName"); else dataQuery.OrderBy("SupplierName"); }
                        else if (sort.Contains("email")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("Email"); else dataQuery.OrderBy("Email"); }
                        else if (sort.Contains("mobileno")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("MobileNo"); else dataQuery.OrderBy("MobileNo"); }
                        else dataQuery.OrderBy("SupplierName");
                    }
                    else
                    {
                        dataQuery.OrderBy("SupplierName");
                    }

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var compiledCount = _compiler.Compile(countQuery);
                    var compiledData = _compiler.Compile(dataQuery);

                    var totalCount = await connection.ExecuteScalarAsync<int>(compiledCount.Sql, compiledCount.NamedBindings, currentTransaction);
                    var suppliers = (await connection.QueryAsync<SupplierDto>(compiledData.Sql, compiledData.NamedBindings, currentTransaction)).ToList();

                    return new SupplierList(suppliers, totalCount, resource.Skip, resource.PageSize);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetAllSupplierQueryHandler. Falling back to EF Core.");
                }
            }

            return await _supplierRepository.GetSuppliers(request.SupplierResource);
        }
    }
}
