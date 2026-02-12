using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.Domain;

namespace POS.Repository
{
    public class LoginAuditRepository : GenericRepository<LoginAudit, POSDbContext>,
       ILoginAuditRepository
    {
        private readonly ILogger<LoginAuditRepository> _logger;
        private readonly IPropertyMappingService _propertyMappingService;
        public LoginAuditRepository(
            IUnitOfWork<POSDbContext> uow,
            ILogger<LoginAuditRepository> logger,
            IPropertyMappingService propertyMappingService
            ) : base(uow)
        {
            _logger = logger;
            _propertyMappingService = propertyMappingService;
        }

        public async Task<LoginAuditList> GetDocumentAuditTrails(LoginAuditResource loginAuditResrouce)
        {
            var collectionBeforePaging = All;
            collectionBeforePaging =
               collectionBeforePaging.ApplySort(loginAuditResrouce.OrderBy,
               _propertyMappingService.GetPropertyMapping<LoginAuditDto, LoginAudit>());

            if (!string.IsNullOrWhiteSpace(loginAuditResrouce.UserName))
            {
                var userName = loginAuditResrouce.UserName.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.UserName.ToLower(), $"%{userName}%"));
            }

            var loginAudits = new LoginAuditList();
            return await loginAudits.Create(
                collectionBeforePaging,
                loginAuditResrouce.Skip,
                loginAuditResrouce.PageSize
                );
        }

        public async Task LoginAudit(LoginAuditDto loginAudit)
        {
            try
            {
                Add(new LoginAudit
                {
                    Id = Guid.NewGuid(),
                    LoginTime = DateTime.UtcNow,
                    Provider = loginAudit.Provider,
                    Status = loginAudit.Status,
                    UserName = loginAudit.UserName,
                    RemoteIP = loginAudit.RemoteIP,
                    Latitude = loginAudit.Latitude,
                    Longitude = loginAudit.Longitude
                });
                await _uow.SaveAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.Message);
            }
        }
    }
}
