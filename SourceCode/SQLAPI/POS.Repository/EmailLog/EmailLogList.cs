using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;

namespace POS.Repository
{
    public class EmailLogList : List<EmailLogDto>
    {
        public EmailLogList()
        {
        }

        public int Skip { get; private set; }
        public int TotalPages { get; private set; }
        public int PageSize { get; private set; }
        public int TotalCount { get; private set; }

        public EmailLogList(List<EmailLogDto> items, int count, int skip, int pageSize)
        {
            TotalCount = count;
            PageSize = pageSize;
            Skip = skip;
            TotalPages = (int)Math.Ceiling(count / (double)pageSize);
            AddRange(items);
        }

        public async Task<EmailLogList> Create(IQueryable<EmailLog> source, int skip, int pageSize)
        {
            var count = await GetCount(source);
            var dtoList = await GetDtos(source, skip, pageSize);
            var dtoPageList = new EmailLogList(dtoList, count, skip, pageSize);
            return dtoPageList;
        }

        public async Task<int> GetCount(IQueryable<EmailLog> source)
        {
            return await source.AsNoTracking().CountAsync();
        }

        public async Task<List<EmailLogDto>> GetDtos(IQueryable<EmailLog> source, int skip, int pageSize)
        {
            var entities = await source
                .Skip(skip)
                .Take(pageSize)
                .AsNoTracking()
                .Select(c => new EmailLogDto
                {
                    Id = c.Id,
                    SenderEmail = c.SenderEmail,
                    RecipientEmail = c.RecipientEmail,
                    Subject = c.Subject,
                    Body = c.Body,
                    ErrorMessage = c.ErrorMessage,
                    SentAt = c.SentAt,
                    Status = c.Status,
                    StatusName = c.Status.ToString(),
                    EmailLogAttachments = c.EmailLogAttachments
                })
                .ToListAsync();
            return entities;
        }
    }
}
