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

namespace POS.MediatR.Handlers
{
    public class GetAllSupplierQueryHandler : IRequestHandler<GetAllSupplierQuery, SupplierList>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetAllSupplierQueryHandler> _logger;

        public GetAllSupplierQueryHandler(
            ISupplierRepository supplierRepository,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllSupplierQueryHandler> logger)
        {
            _supplierRepository = supplierRepository;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        public async Task<SupplierList> Handle(GetAllSupplierQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetAllSupplierQueryHandler");
            var resource = request.SupplierResource;

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var supplierTable = _sqlAccessor.GetTableName<POS.Data.Supplier>();

                    var sqlBuilder = new StringBuilder($@"
                        FROM {supplierTable}
                        WHERE TenantId = @TenantId AND IsDeleted = @IsDeleted
                    ");

                    var parameters = new DynamicParameters();
                    parameters.Add("TenantId", tenantId);
                    parameters.Add("IsDeleted", false);

                    if (resource.Id != null)
                    {
                        parameters.Add("Id", resource.Id);
                        sqlBuilder.Append(" AND Id = @Id");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.SupplierName))
                    {
                        parameters.Add("SupplierName", $"{resource.SupplierName.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND LOWER(SupplierName) LIKE @SupplierName");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.MobileNo))
                    {
                        parameters.Add("MobileNo", $"%{resource.MobileNo.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND ((MobileNo IS NOT NULL AND LOWER(MobileNo) LIKE @MobileNo) OR (PhoneNo IS NOT NULL AND LOWER(PhoneNo) LIKE @MobileNo))");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Email))
                    {
                        parameters.Add("Email", $"{resource.Email.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND LOWER(Email) LIKE @Email");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Website))
                    {
                        parameters.Add("Website", $"%{resource.Website.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND LOWER(Website) LIKE @Website");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.SearchQuery))
                    {
                        parameters.Add("SearchQuery", $"%{resource.SearchQuery.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(@" AND (
                            LOWER(SupplierName) LIKE @SearchQuery OR
                            LOWER(MobileNo) LIKE @SearchQuery OR
                            (PhoneNo IS NOT NULL AND LOWER(PhoneNo) LIKE @SearchQuery)
                        )");
                    }

                    var countSql = $"SELECT COUNT(*) {sqlBuilder.ToString()}";

                    // Default order by SupplierName
                    var orderBy = "ORDER BY SupplierName ASC";
                    if (!string.IsNullOrWhiteSpace(resource.OrderBy))
                    {
                        var sort = resource.OrderBy.ToLower();
                        if (sort.Contains("suppliername")) orderBy = sort.EndsWith("desc") ? "ORDER BY SupplierName DESC" : "ORDER BY SupplierName ASC";
                        else if (sort.Contains("email")) orderBy = sort.EndsWith("desc") ? "ORDER BY Email DESC" : "ORDER BY Email ASC";
                        else if (sort.Contains("mobileno")) orderBy = sort.EndsWith("desc") ? "ORDER BY MobileNo DESC" : "ORDER BY MobileNo ASC";
                    }

                    var dataSql = $@"
                        SELECT Id, SupplierName, Email, ContactPerson, MobileNo, PhoneNo, Website, Description, Fax, BillingAddressId
                        {sqlBuilder.ToString()}
                        {orderBy}
                        LIMIT @PageSize OFFSET @Skip
                    ";
                    
                    parameters.Add("PageSize", resource.PageSize);
                    parameters.Add("Skip", resource.Skip);

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    // Execute both queries in a single batch (QueryMultiple)
                    var multiSql = $"{countSql}; {dataSql};";
                    using var multi = await connection.QueryMultipleAsync(multiSql, parameters, currentTransaction, commandTimeout: 30);

                    var totalCount = await multi.ReadFirstAsync<int>();
                    var suppliers = (await multi.ReadAsync<SupplierDto>()).ToList();

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
