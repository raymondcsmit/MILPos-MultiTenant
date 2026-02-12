using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.Domain;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class ReminderRepository : GenericRepository<Reminder, POSDbContext>,
        IReminderRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;

        public ReminderRepository(
            IUnitOfWork<POSDbContext> uow,
            IPropertyMappingService propertyMappingService
            ) : base(uow)
        {
            _propertyMappingService = propertyMappingService;
        }

        public async Task<ReminderList> GetReminders(ReminderResource reminderResource)
        {
            var collectionBeforePaging = All;
            collectionBeforePaging =
               collectionBeforePaging.ApplySort(reminderResource.OrderBy,
               _propertyMappingService.GetPropertyMapping<ReminderDto, Reminder>());

            if (!string.IsNullOrWhiteSpace(reminderResource.Subject))
            {
                var subject = reminderResource.Subject.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.Subject.ToLower(), $"%{subject}%"));
            }

            if (!string.IsNullOrWhiteSpace(reminderResource.Message))
            {
                var message = reminderResource.Message.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.Message.ToLower(), $"%{message}%"));
            }

            if (reminderResource.Frequency.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => c.Frequency == reminderResource.Frequency);
            }

            var reminders = new ReminderList();
            return await reminders.Create(
                collectionBeforePaging,
                reminderResource.Skip,
                reminderResource.PageSize
                );
        }
    }
}
