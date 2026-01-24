using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class GetHalfYearlyReminderQueryHandler(IReminderRepository reminderRepository,
        UserInfoToken userInfoToken)
                : IRequestHandler<GetHalfYearlyReminderQuery, List<CalenderReminderDto>>
    {

        public async Task<List<CalenderReminderDto>> Handle(GetHalfYearlyReminderQuery request, CancellationToken cancellationToken)
        {
            var startDate = new DateTime(request.Year, request.Month, 1, 0, 0, 1);
            var currentQuater = GetCurrentQuater(startDate);
            var monthEndDate = startDate.AddMonths(1).AddDays(-1);
            var endDate = new DateTime(monthEndDate.Year, monthEndDate.Month, monthEndDate.Day, 23, 59, 59);
            var lastDayOfMonth = endDate.Day;
            var reminders = await reminderRepository.All
                 .Include(c => c.ReminderUsers)
                 .Include(c => c.HalfYearlyReminders.Where(c => c.Quarter == currentQuater))
                 .Where(c => c.Frequency == Frequency.HalfYearly
                 && c.ReminderUsers.Any(d => d.UserId == userInfoToken.Id)
                 && c.HalfYearlyReminders.Any(c => c.Month == request.Month)
                 && c.StartDate <= endDate && (!c.EndDate.HasValue || c.EndDate >= startDate))
                 .ToListAsync(cancellationToken);

            var reminderDto = reminders.Select(c =>
            {
                var quater = c.HalfYearlyReminders.FirstOrDefault();
                return new CalenderReminderDto
                {
                    Title = c.Subject,
                    Start = new DateTime(startDate.Year, startDate.Month, quater.Day, 0, 0, 10),
                    End = new DateTime(startDate.Year, startDate.Month, quater.Day, 0, 0, 20),
                    Id = c.Id
                };
            }).ToList();
            return reminderDto;
        }

        private QuarterEnum GetCurrentQuater(DateTime date)
        {
            if (date >= new DateTime(date.Year, 1, 1) && date <= new DateTime(date.Year, 6, 30))
            {
                return QuarterEnum.Quarter1;
            }
            else
            {
                return QuarterEnum.Quarter2;
            }
        }
    }
}
