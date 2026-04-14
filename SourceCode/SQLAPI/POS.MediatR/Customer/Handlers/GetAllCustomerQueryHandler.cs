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

using SqlKata;
using SqlKata.Compilers;

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
        private readonly Compiler _compiler;

        public GetAllCustomerQueryHandler(
            ICustomerRepository customerRepository,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllCustomerQueryHandler> logger,
            UserInfoToken userInfoToken,
            Compiler compiler)
        {
            _customerRepository = customerRepository;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
            _userInfoToken = userInfoToken;
            _compiler = compiler;
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

                    var query = new Query(customerTable)
                        .Where("TenantId", tenantId)
                        .Where("IsDeleted", false);

                    // Data Isolation
                    var isSalesPerson = _userInfoToken.LocationIds != null && _userInfoToken.LocationIds.Any();
                    if (isSalesPerson)
                    {
                        var allowedLocations = _userInfoToken.LocationIds ?? new List<Guid>();
                        query.Where(q => q.Where("SalesPersonId", _userInfoToken.Id).OrWhereIn("LocationId", allowedLocations));
                    }

                    if (!string.IsNullOrWhiteSpace(resource.CustomerName))
                    {
                        query.WhereRaw(@"LOWER(""CustomerName"") LIKE ?", $"{resource.CustomerName.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.ContactPerson))
                    {
                        query.WhereRaw(@"LOWER(""ContactPerson"") LIKE ?", $"{resource.ContactPerson.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.PhoneNo))
                    {
                        query.WhereNotNull("PhoneNo").WhereRaw(@"LOWER(""PhoneNo"") LIKE ?", $"{resource.PhoneNo.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.MobileNo))
                    {
                        query.WhereNotNull("MobileNo").WhereRaw(@"LOWER(""MobileNo"") LIKE ?", $"{resource.MobileNo.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Email))
                    {
                        query.WhereNotNull("Email").WhereRaw(@"LOWER(""Email"") LIKE ?", $"{resource.Email.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.Website))
                    {
                        query.WhereNotNull("Website").WhereRaw(@"LOWER(""Website"") LIKE ?", $"{resource.Website.Trim().ToLowerInvariant()}%");
                    }

                    if (!string.IsNullOrWhiteSpace(resource.SearchQuery))
                    {
                        var searchPattern = $"%{resource.SearchQuery.Trim().ToLowerInvariant()}%";
                        query.Where(q => q
                            .WhereRaw(@"(""Email"" IS NOT NULL AND LOWER(""Email"") LIKE ?)", searchPattern)
                            .OrWhereRaw(@"LOWER(""CustomerName"") LIKE ?", searchPattern)
                            .OrWhereRaw(@"(""MobileNo"" IS NOT NULL AND LOWER(""MobileNo"") LIKE ?)", searchPattern)
                            .OrWhereRaw(@"(""PhoneNo"" IS NOT NULL AND LOWER(""PhoneNo"") LIKE ?)", searchPattern)
                        );
                    }

                    var countQuery = query.Clone().AsCount();

                    var dataQuery = query.Clone()
                        .Select("Id", "CustomerName", "Email", "ContactPerson", "MobileNo", "Website", "IsWalkIn")
                        .Limit(resource.PageSize)
                        .Offset(resource.Skip);

                    if (!string.IsNullOrWhiteSpace(resource.OrderBy))
                    {
                        var sort = resource.OrderBy.ToLower();
                        if (sort.Contains("customername")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("CustomerName"); else dataQuery.OrderBy("CustomerName"); }
                        else if (sort.Contains("email")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("Email"); else dataQuery.OrderBy("Email"); }
                        else if (sort.Contains("mobileno")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("MobileNo"); else dataQuery.OrderBy("MobileNo"); }
                        else dataQuery.OrderBy("CustomerName");
                    }
                    else
                    {
                        dataQuery.OrderBy("CustomerName");
                    }

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var compiledCount = _compiler.Compile(countQuery);
                    var compiledData = _compiler.Compile(dataQuery);

                    var totalCount = await connection.ExecuteScalarAsync<int>(compiledCount.Sql, compiledCount.NamedBindings, currentTransaction);
                    var customers = (await connection.QueryAsync<CustomerDto>(compiledData.Sql, compiledData.NamedBindings, currentTransaction)).ToList();

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
