using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.FBR;
using POS.Domain;
using POS.Domain.FBR;
using System.Text.Json;
using System.Collections.Generic;

namespace POS.API.BackgroundServices
{
    /// <summary>
    /// Background service that continuously processes FBR invoice submission queue
    /// </summary>
    public class FBRSyncBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<FBRSyncBackgroundService> _logger;
        private readonly TimeSpan _processingInterval = TimeSpan.FromSeconds(30);
        
        public FBRSyncBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<FBRSyncBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }
        
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("FBR Sync Background Service started");
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingInvoicesAsync(stoppingToken);
                    await ProcessRetryQueueAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in FBR Sync Background Service");
                }
                
                await Task.Delay(_processingInterval, stoppingToken);
            }
            
            _logger.LogInformation("FBR Sync Background Service stopped");
        }
        
        private async Task ProcessPendingInvoicesAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
            // Using IServiceProvider to resolve IFBRInvoiceService safely
            var fbrService = scope.ServiceProvider.GetService<IFBRInvoiceService>();
            
            if (fbrService == null)
            {
                 _logger.LogWarning("IFBRInvoiceService not registered. Skipping FBR sync.");
                 return;
            }

            // Get invoices that need FBR submission
            var pendingInvoices = await context.SalesOrders
                .Where(so => so.FBRStatus == FBRSubmissionStatus.NotSubmitted 
                          || so.FBRStatus == FBRSubmissionStatus.Queued)
                .Where(so => so.FBRRetryCount < 5) // Max retry limit
                .OrderBy(so => so.CreatedDate)
                .Take(10) // Process 10 at a time
                .ToListAsync(cancellationToken);
            
            foreach (var invoice in pendingInvoices)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;
                    
                await SubmitInvoiceToFBRAsync(invoice, fbrService, context);
            }
        }
        
        private async Task ProcessRetryQueueAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
            var fbrService = scope.ServiceProvider.GetService<IFBRInvoiceService>();

            if (fbrService == null) return;
            
            // Get failed invoices ready for retry
            var now = DateTime.UtcNow;
            var retryInvoices = await context.SalesOrders
                .Where(so => so.FBRStatus == FBRSubmissionStatus.Failed)
                .Where(so => so.FBRNextRetryAt <= now)
                .Where(so => so.FBRRetryCount < 5)
                .OrderBy(so => so.FBRNextRetryAt)
                .Take(5) // Process 5 retries at a time
                .ToListAsync(cancellationToken);
            
            foreach (var invoice in retryInvoices)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;
                    
                await SubmitInvoiceToFBRAsync(invoice, fbrService, context);
            }
        }
        
        private async Task SubmitInvoiceToFBRAsync(
            SalesOrder salesOrder, 
            IFBRInvoiceService fbrService, 
            POSDbContext context)
        {
            try
            {
                _logger.LogInformation(
                    "Submitting invoice {InvoiceId} to FBR (Attempt {Attempt})", 
                    salesOrder.Id, 
                    salesOrder.FBRRetryCount + 1);
                
                // Update status to Submitting
                salesOrder.FBRStatus = FBRSubmissionStatus.Submitting;
                await context.SaveChangesAsync();
                
                // Submit to FBR
                var response = await fbrService.SubmitInvoiceAsync(salesOrder);
                
                // Update with FBR response
                salesOrder.FBRStatus = FBRSubmissionStatus.Acknowledged;
                salesOrder.FBRInvoiceNumber = response.InvoiceNumber;
                salesOrder.FBRUSIN = response.USIN;
                salesOrder.FBRQRCodeData = response.QRCodeData;
                salesOrder.FBRAcknowledgedAt = DateTime.UtcNow;
                salesOrder.FBRResponseJson = JsonSerializer.Serialize(response);
                
                // Generate and save QR code image
                var qrCodePath = await GenerateQRCodeImageAsync(response.QRCodeData, salesOrder.Id);
                salesOrder.FBRQRCodeImagePath = qrCodePath;
                
                await context.SaveChangesAsync();
                
                _logger.LogInformation(
                    "Successfully submitted invoice {InvoiceId} to FBR. FBR Number: {FBRNumber}", 
                    salesOrder.Id, 
                    response.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to submit invoice {InvoiceId} to FBR", salesOrder.Id);
                
                // Update failure status
                salesOrder.FBRStatus = FBRSubmissionStatus.Failed;
                salesOrder.FBRRetryCount++;
                salesOrder.FBRErrorMessage = ex.Message;
                
                // Calculate next retry time with exponential backoff
                var delaySeconds = Math.Min(
                    60 * Math.Pow(2, salesOrder.FBRRetryCount), // Exponential: 60, 120, 240, 480, 960
                    3600 // Max 1 hour
                );
                salesOrder.FBRNextRetryAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                
                // If max retries reached, require manual review
                if (salesOrder.FBRRetryCount >= 5)
                {
                    salesOrder.FBRStatus = FBRSubmissionStatus.RequiresManualReview;
                    _logger.LogWarning(
                        "Invoice {InvoiceId} requires manual review after {Attempts} failed attempts", 
                        salesOrder.Id, 
                        salesOrder.FBRRetryCount);
                }
                
                await context.SaveChangesAsync();
            }
        }
        
        private async Task<string> GenerateQRCodeImageAsync(string qrData, Guid invoiceId)
        {
            // Placeholder: In a real implementation, you would generate a QR code image here
            // For now, we return a path and assume the frontend handles it or it's generated on demand
            return $"/qrcodes/{invoiceId}.png";
        }
    }
}
