using System.Collections.Generic;
using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Helper;

namespace POS.Repository
{
    public interface IEmailLogRepository : IGenericRepository<EmailLog>
    {
        Task<EmailLogList> GetEmailLogs(EmailLogResource emailLogResource);
        Task CreateEmailLog(SendEmailSpecification emailLogDto, string error);
    }
}
