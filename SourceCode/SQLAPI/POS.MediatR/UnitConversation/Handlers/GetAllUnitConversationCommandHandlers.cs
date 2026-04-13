using AutoMapper;
using AutoMapper.QueryableExtensions;
using Dapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using POS.Common.DapperInfrastructure;
using POS.Data.Dto;
using POS.Domain;
using POS.MediatR.UnitConversation.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.UnitConversation.Handlers
{
    public class GetAllUnitConversationCommandHandlers : IRequestHandler<GetAllUnitConversationCommand, List<UnitConversationDto>>
    {
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetAllUnitConversationCommandHandlers> _logger;

        public GetAllUnitConversationCommandHandlers(
            IUnitConversationRepository unitConversationRepository,
            IMapper mapper,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllUnitConversationCommandHandlers> logger)
        {
            _unitConversationRepository = unitConversationRepository;
            _mapper = mapper;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        public async Task<List<UnitConversationDto>> Handle(GetAllUnitConversationCommand request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetAllUnitConversationCommandHandlers");

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var unitTable = _sqlAccessor.GetTableName<POS.Data.UnitConversation>();

                    var sql = $@"
                        SELECT 
                            u.""Id"", 
                            u.""Name"", 
                            u.""ParentId"", 
                            CASE WHEN p.""Id"" IS NOT NULL THEN COALESCE(p.""Name"", '') || '(' || COALESCE(p.""Code"", '') || ')' ELSE '' END AS ""BaseUnitName"",
                            u.""Value"", 
                            u.""Operator"", 
                            u.""Code""
                        FROM {unitTable} u
                        LEFT JOIN {unitTable} p ON u.""ParentId"" = p.""Id"" AND p.""TenantId"" = @TenantId AND p.""IsDeleted"" = false
                        WHERE u.""TenantId"" = @TenantId 
                          AND u.""IsDeleted"" = false
                        ORDER BY u.""Name"" ASC
                    ";

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var command = new CommandDefinition(sql, new { TenantId = tenantId }, currentTransaction, commandTimeout: 30, cancellationToken: cancellationToken);
                    var units = await connection.QueryAsync<UnitConversationDto>(command);

                    return units.ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetAllUnitConversationCommandHandlers. Falling back to EF Core.");
                }
            }

            var fallbackUnits = await _unitConversationRepository.AllIncluding(c => c.Parent)
                .OrderBy(c => c.Name)
                .Select(c => new UnitConversationDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    ParentId = c.ParentId,
                    BaseUnitName = c.Parent != null ? c.Parent.Name + "(" + c.Parent.Code + ")" : "",
                    Value = c.Value,
                    Operator = c.Operator,
                    Code = c.Code,
                })
                .ToListAsync(cancellationToken);
            return fallbackUnits;
        }
    }
}
