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
using System.Collections.Generic;

namespace POS.MediatR.Handlers
{
    public class GetAllCustomerQueryHandler : IRequestHandler<GetAllCustomerQuery, CustomerList>
    {
        private readonly ICustomerRepository _customerRepository;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetAllCustomerQueryHandler> _logger;
        private readonly UserInfoToken _userInfoToken;

        public GetAllCustomerQueryHandler(
            ICustomerRepository customerRepository,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllCustomerQueryHandler> logger,
            UserInfoToken userInfoToken)
        {
            _customerRepository = customerRepository;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
            _userInfoToken = userInfoToken;
        }

        public async Task<CustomerList> Handle(GetAllCustomerQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetAllCustomerQueryHandler");
            var resource = request.CustomerResource;

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var customerTable = _sqlAccessor.GetTableName<POS.Data.Customer>();

                    var sqlBuilder = new StringBuilder($@"
                        FROM {customerTable}
                        WHERE TenantId = @TenantId AND IsDeleted = @IsDeleted
                    ");

                    var parameters = new DynamicParameters();
                    parameters.Add("TenantId", tenantId);
                    parameters.Add("IsDeleted", false);

                    // Data Isolation
                    var isSalesPerson = _userInfoToken.LocationIds != null && _userInfoToken.LocationIds.Any();
                    if (isSalesPerson)
                    {
                        var allowedLocations = _userInfoToken.LocationIds ?? new List<Guid>();
                        sqlBuilder.Append(" AND (SalesPersonId = @UserId OR LocationId IN @AllowedLocations)");
                        parameters.Add("UserId", _userInfoToken.Id);
                        parameters.Add("AllowedLocations", allowedLocations);
                    }

                    if (!string.IsNullOrWhiteSpace(resource.CustomerName))
                    {
                        parameters.Add("CustomerName", $"{resource.CustomerName.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND LOWER(CustomerName) LIKE @CustomerName");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.ContactPerson))
                    {
                        parameters.Add("ContactPerson", $"{resource.ContactPerson.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND LOWER(ContactPerson) LIKE @ContactPerson");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.PhoneNo))
                    {
                        parameters.Add("PhoneNo", $"{resource.PhoneNo.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND PhoneNo IS NOT NULL AND LOWER(PhoneNo) LIKE @PhoneNo");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.MobileNo))
                    {
                        parameters.Add("MobileNo", $"{resource.MobileNo.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND MobileNo IS NOT NULL AND LOWER(MobileNo) LIKE @MobileNo");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Email))
                    {
                        parameters.Add("Email", $"{resource.Email.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND Email IS NOT NULL AND LOWER(Email) LIKE @Email");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Website))
                    {
                        parameters.Add("Website", $"{resource.Website.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(" AND Website IS NOT NULL AND LOWER(Website) LIKE @Website");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.SearchQuery))
                    {
                        parameters.Add("SearchQuery", $"%{resource.SearchQuery.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(@" AND (
                            (Email IS NOT NULL AND LOWER(Email) LIKE @SearchQuery) OR
                            LOWER(CustomerName) LIKE @SearchQuery OR
                            (MobileNo IS NOT NULL AND LOWER(MobileNo) LIKE @SearchQuery) OR
                            (PhoneNo IS NOT NULL AND LOWER(PhoneNo) LIKE @SearchQuery)
                        )");
                    }

                    var countSql = $"SELECT COUNT(*) {sqlBuilder.ToString()}";

                    // Default order by CustomerName
                    var orderBy = "ORDER BY CustomerName ASC";
                    if (!string.IsNullOrWhiteSpace(resource.OrderBy))
                    {
                        var sort = resource.OrderBy.ToLower();
                        if (sort.Contains("customername")) orderBy = sort.EndsWith("desc") ? "ORDER BY CustomerName DESC" : "ORDER BY CustomerName ASC";
                        else if (sort.Contains("email")) orderBy = sort.EndsWith("desc") ? "ORDER BY Email DESC" : "ORDER BY Email ASC";
                        else if (sort.Contains("mobileno")) orderBy = sort.EndsWith("desc") ? "ORDER BY MobileNo DESC" : "ORDER BY MobileNo ASC";
                    }

                    var dataSql = $@"
                        SELECT Id, CustomerName, Email, ContactPerson, MobileNo, Website, IsWalkIn
                        {sqlBuilder.ToString()}
                        {orderBy}
                        LIMIT @PageSize OFFSET @Skip
                    ";
                    
                    parameters.Add("PageSize", resource.PageSize);
                    parameters.Add("Skip", resource.Skip);

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    // Execute both queries in a single batch (QueryMultiple) to halve network latency
                    var multiSql = $"{countSql}; {dataSql};";
                    using var multi = await connection.QueryMultipleAsync(multiSql, parameters, currentTransaction, commandTimeout: 30);

                    var totalCount = await multi.ReadFirstAsync<int>();
                    var customers = (await multi.ReadAsync<CustomerDto>()).ToList();

                    return new CustomerList(customers, totalCount, resource.Skip, resource.PageSize);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetAllCustomerQueryHandler. Falling back to EF Core.");
                }
            }

            return await _customerRepository.GetCustomers(request.CustomerResource);
        }
    }
}
