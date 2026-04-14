using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Dashboard.Commands;
using POS.API.Helpers;
using System;
using POS.Data.Entities;
using System.Collections.Generic;

namespace POS.API.Controllers.Dashboard
{
    /// <summary>
    /// DashboardController
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {

        public IMediator _mediator { get; set; }
        /// <summary>
        /// DashboardController
        /// </summary>
        /// <param name="mediator"></param>
        public DashboardController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Gets the daily reminders.
        /// </summary>
        /// <param name="month">The month.</param>
        /// <param name="year">The year.</param>
        /// <returns></returns>
        [HttpGet("dailyreminder/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetDailyReminders(int month, int year)
        {
            var monthlyEventQuery = new GetDailyReminderQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Gets the weekly reminders.
        /// </summary>
        /// <param name="month">The month.</param>
        /// <param name="year">The year.</param>
        /// <returns></returns>
        [HttpGet("weeklyreminder/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetWeeklyReminders(int month, int year)
        {
            var monthlyEventQuery = new GetWeeklyReminderQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Gets the monthly reminders.
        /// </summary>
        /// <param name="month">The month.</param>
        /// <param name="year">The year.</param>
        /// <returns></returns>
        [HttpGet("monthlyreminder/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetMonthlyReminders(int month, int year)
        {
            var monthlyEventQuery = new GetMonthlyReminderQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Gets the quarterly reminders.
        /// </summary>
        /// <param name="month">The month.</param>
        /// <param name="year">The year.</param>
        /// <returns></returns>
        [HttpGet("quarterlyreminder/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetQuarterlyReminders(int month, int year)
        {
            var monthlyEventQuery = new GetQuarterlyReminderQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Gets the half yearly reminders.
        /// </summary>
        /// <param name="month">The month.</param>
        /// <param name="year">The year.</param>
        /// <returns></returns>
        [HttpGet("halfyearlyreminder/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetHalfYearlyReminders(int month, int year)
        {
            var monthlyEventQuery = new GetHalfYearlyReminderQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Gets the yearly reminders.
        /// </summary>
        /// <param name="month">The month.</param>
        /// <param name="year">The year.</param>
        /// <returns></returns>
        [HttpGet("yearlyreminder/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetYearlyReminders(int month, int year)
        {
            var monthlyEventQuery = new GetYearlyReminderQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Get Custom Reminders.
        /// </summary>
        /// <param name="month"></param>
        /// <param name="year"></param>
        /// <returns></returns>
        [HttpGet("onetime/{month}/{year}")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetOneTimeReminders(int month, int year)
        {
            var monthlyEventQuery = new GetOneTimeReminerQuery { Month = month, Year = year };
            var result = await _mediator.Send(monthlyEventQuery);
            return Ok(result);
        }

        /// <summary>
        /// Get Best Selling Products
        /// </summary>
        /// <param name="getBestSellingProductCommand"></param>
        /// <returns></returns>
        [HttpGet("bestsellingproduct")]
        [ClaimCheck("DB_BEST_SELLING_PROS")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> BestSellingProduct([FromQuery] GetBestSellingProductCommand getBestSellingProductCommand)
        {
            var result = await _mediator.Send(getBestSellingProductCommand);
            return Ok(result);
        }

        /// <summary>
        /// Get Sells vs Purchase Report.
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("salesvspurchase")]
        [ClaimCheck("REP_SALES_VS_PURCHASE_REP")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> SalesVsPurchase([FromQuery] GetSalesVsPurchaseReportCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Gets the dashboard statistics.
        /// </summary>
        /// <returns></returns>
        [HttpGet("statistics")]
        [ClaimCheck("DB_STATISTICS")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetAccountDashboardStatistics([FromQuery] GetDashbordAccountQueryCommand dashboardStaticaticsQuery)
        {
            var result = await _mediator.Send(dashboardStaticaticsQuery);
            return Ok(result);
        }

        /// <summary>
        /// Gets product sales comparison (Current vs Last Year).
        /// </summary>
        /// <returns></returns>
        [HttpGet("product-sales-comparison")]
        [ClaimCheck("DB_BEST_SELLING_PROS")] // Reuse existing claim or create new? Using existing for now to avoid permission issues.
        [Produces("application/json", "application/xml", Type = typeof(List<POS.Data.Dto.Dashboard.ProductSalesComparisonDto>))]
        public async Task<IActionResult> GetProductSalesComparison([FromQuery] GetProductSalesComparisonQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        /// <summary>
        /// Gets income comparison (Current vs Previous Year sales - purchase).
        /// </summary>
        /// <returns></returns>
        [HttpGet("income-comparison")]
        [ClaimCheck("DB_STATISTICS")] // Reuse statistics claim
        [Produces("application/json", "application/xml", Type = typeof(List<POS.Data.Dto.Dashboard.IncomeComparisonDto>))]
        public async Task<IActionResult> GetIncomeComparison([FromQuery] GetIncomeComparisonQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        /// <summary>
        /// Gets sales comparison (Current vs Previous Year).
        /// </summary>
        /// <returns></returns>
        [HttpGet("sales-comparison")]
        [ClaimCheck("DB_STATISTICS")] // Reuse statistics claim
        [Produces("application/json", "application/xml", Type = typeof(List<POS.Data.Dto.Dashboard.SalesComparisonDto>))]
        public async Task<IActionResult> GetSalesComparison([FromQuery] GetSalesComparisonQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }

    }
}
