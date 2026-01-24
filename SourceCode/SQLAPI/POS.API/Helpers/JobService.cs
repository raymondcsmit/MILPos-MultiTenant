using Hangfire;
using MediatR;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System;
using System.Threading.Tasks;

namespace POS.API.Helpers
{
    public class JobService
    {
        public IMediator _mediator { get; set; }
        private readonly IConnectionMappingRepository _connectionMappingRepository;

        /// <summary>
        /// Job Service
        /// </summary>
        /// <param name="mediator"></param>
        /// <param name="connectionMappingRepository"></param>
        public JobService(IMediator mediator,
            IConnectionMappingRepository connectionMappingRepository)
        {
            _mediator = mediator;
            _connectionMappingRepository = connectionMappingRepository;
        }

        /// <summary>
        /// Start Scheduler
        /// </summary>
        public void StartScheduler()
        {
            // * * * * *
            // 1 2 3 4 5

            // field #   meaning        allowed values
            // -------   ------------   --------------
            //    1      minute         0-59
            //    2      hour           0-23
            //    3      day of month   1-31
            //    4      month          1-12 (or use names)
            //    5      day of week    0-7 (0 or 7 is Sun, or use names)


            //Daily Reminder
            RecurringJob.AddOrUpdate("DailyReminder", () => DailyReminder(), Cron.Daily(0, 10), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //Weekly Reminder
            RecurringJob.AddOrUpdate("WeeklyReminder", () => WeeklyReminder(), Cron.Daily(0, 15), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //Monthy Reminder
            RecurringJob.AddOrUpdate("MonthlyReminder", () => MonthyReminder(), Cron.Daily(0, 20), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //Quarterly Reminder
            RecurringJob.AddOrUpdate("QuarterlyReminder", () => QuarterlyReminder(), Cron.Daily(0, 30), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //HalfYearly Reminder
            RecurringJob.AddOrUpdate("HalfYearlyReminder", () => HalfYearlyReminder(), Cron.Daily(0, 40), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //Yearly Reminder                                                                                
            RecurringJob.AddOrUpdate("YearlyReminder", () => YearlyReminder(), Cron.Daily(0, 50), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //Customer Date
            RecurringJob.AddOrUpdate("CustomDateReminder", () => CustomDateReminderSchedule(), Cron.Daily(0, 59), new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 24 hours

            //Reminder Scheduler To Send Email
            RecurringJob.AddOrUpdate("ReminderSchedule", () => ReminderSchedule(), "*/10 * * * *", new RecurringJobOptions { TimeZone = TimeZoneInfo.Local }); // Every 10 minutes

            ////hangfire-cleanup
            //RecurringJob.AddOrUpdate<HangfireCleanupService>("hangfire-cleanup", x => x.CleanupOldJobs(), Cron.Daily, new RecurringJobOptions { TimeZone = TimeZoneInfo.Local });
        }

        /// <summary>
        /// Daily Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> DailyReminder()
        {
            return await _mediator.Send(new DailyReminderServicesQuery());
        }
        /// <summary>
        /// Weekly Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> WeeklyReminder()
        {
            return await _mediator.Send(new WeeklyReminderServicesQuery());
        }
        /// <summary>
        /// Monthy Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> MonthyReminder()
        {
            return await _mediator.Send(new MonthlyReminderServicesQuery());
        }
        /// <summary>
        /// Quarterly Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> QuarterlyReminder()
        {
            return await _mediator.Send(new QuarterlyReminderServiceQuery());
        }
        /// <summary>
        /// HalfYearly Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> HalfYearlyReminder()
        {
            return await _mediator.Send(new HalfYearlyReminderServiceQuery());
        }
        /// <summary>
        /// Yearly Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> YearlyReminder()
        {
            return await _mediator.Send(new YearlyReminderServicesQuery());
        }
        /// <summary>
        /// Reminder Scheduler To Send Email
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> ReminderSchedule()
        {
            var schedulerStatus = _connectionMappingRepository.GetSchedulerServiceStatus();
            if (!schedulerStatus)
            {
                _connectionMappingRepository.SetSchedulerServiceStatus(true);
                var result = await _mediator.Send(new ReminderSchedulerServiceQuery());
                _connectionMappingRepository.SetSchedulerServiceStatus(false);
                return result;
            }
            return true;
        }
        /// <summary>
        /// Custom Date Reminder
        /// </summary>
        /// <returns></returns>
        [Queue("reminder")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task<bool> CustomDateReminderSchedule()
        {
            return await _mediator.Send(new CustomDateReminderServicesQuery());
        }
    }
}
