using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Entities.FBR;
using POS.Domain;
using POS.Domain.FBR;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers.FBR
{
    [ApiController]
    [Route("api/fbr")]
    public class FBRController : ControllerBase
    {
        private readonly IFBRInvoiceService _fbrService;
        private readonly POSDbContext _context;
        
        public FBRController(IFBRInvoiceService fbrService, POSDbContext context)
        {
            _fbrService = fbrService;
            _context = context;
        }
        
        /// <summary>
        /// Manually submit invoice to FBR
        /// </summary>
        [HttpPost("submit/{salesOrderId}")]
        public async Task<IActionResult> SubmitInvoice(Guid salesOrderId)
        {
            var salesOrder = await _context.SalesOrders.FindAsync(salesOrderId);
            if (salesOrder == null)
                return NotFound();
            
            try
            {
                var response = await _fbrService.SubmitInvoiceAsync(salesOrder);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
        
        /// <summary>
        /// Get FBR submission status for invoice
        /// </summary>
        [HttpGet("status/{salesOrderId}")]
        public async Task<IActionResult> GetStatus(Guid salesOrderId)
        {
            var salesOrder = await _context.SalesOrders.FindAsync(salesOrderId);
            if (salesOrder == null)
                return NotFound();
            
            return Ok(new
            {
                fbrStatus = salesOrder.FBRStatus.ToString(),
                fbrInvoiceNumber = salesOrder.FBRInvoiceNumber,
                fbrUSIN = salesOrder.FBRUSIN,
                submittedAt = salesOrder.FBRSubmittedAt,
                acknowledgedAt = salesOrder.FBRAcknowledgedAt,
                retryCount = salesOrder.FBRRetryCount,
                errorMessage = salesOrder.FBRErrorMessage
            });
        }
    }
}
