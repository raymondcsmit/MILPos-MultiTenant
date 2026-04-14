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
using SqlKata;
using SqlKata.Compilers;

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
        private readonly Compiler _compiler;

        public GetAllUnitConversationCommandHandlers(
            IUnitConversationRepository unitConversationRepository,
            IMapper mapper,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetAllUnitConversationCommandHandlers> logger,
            Compiler compiler)
        {
            _unitConversationRepository = unitConversationRepository;
            _mapper = mapper;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
            _compiler = compiler;
        }

        public async Task<List<UnitConversationDto>> Handle(GetAllUnitConversationCommand request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetAllUnitConversationCommandHandlers", true);

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var unitTable = _sqlAccessor.GetTableName<POS.Data.UnitConversation>();

                    var query = new Query($"{unitTable} AS u")
                        .Select("u.Id", "u.Name", "u.ParentId", "u.Value", "u.Operator", "u.Code")
                        .Select("p.Name AS ParentName", "p.Code AS ParentCode")
                        .LeftJoin($"{unitTable} AS p", j => j.On("u.ParentId", "p.Id").Where("p.TenantId", tenantId).Where("p.IsDeleted", false))
                        .Where("u.TenantId", tenantId)
                        .Where("u.IsDeleted", false)
                        .OrderBy("u.Name");

                    var compiled = _compiler.Compile(query);

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var units = await connection.QueryAsync<UnitConversationRawDto>(compiled.Sql, compiled.NamedBindings, currentTransaction, commandTimeout: 30);

                    return units.Select(u => new UnitConversationDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        ParentId = u.ParentId,
                        BaseUnitName = !string.IsNullOrEmpty(u.ParentName) ? $"{u.ParentName}({u.ParentCode})" : "",
                        Value = u.Value,
                        Operator = u.Operator,
                        Code = u.Code
                    }).ToList();
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
        
        private class UnitConversationRawDto
        {
            public Guid Id { get; set; }
            public string Name { get; set; }
            public Guid? ParentId { get; set; }
            public string ParentName { get; set; }
            public string ParentCode { get; set; }
            public decimal? Value { get; set; }
            public POS.Data.Operator? Operator { get; set; }
            public string Code { get; set; }
        }
    }
}