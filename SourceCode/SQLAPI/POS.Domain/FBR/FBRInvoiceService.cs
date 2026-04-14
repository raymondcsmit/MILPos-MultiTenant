using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Data.Entities.FBR;
using POS.Domain.FBR.DTOs;
using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using POS.Data.Entities.Accounts;

namespace POS.Domain.FBR
{
    /// <summary>
    /// Service for submitting invoices to FBR API
    /// </summary>
    public class FBRInvoiceService : IFBRInvoiceService
    {
        private readonly POSDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<FBRInvoiceService> _logger;
        private readonly IFBRQRCodeService _qrCodeService;

        public FBRInvoiceService(
            POSDbContext context,
            HttpClient httpClient,
            ILogger<FBRInvoiceService> logger,
            IFBRQRCodeService qrCodeService)
        {
            _context = context;
            _httpClient = httpClient;
            _logger = logger;
            _qrCodeService = qrCodeService;
        }

        /// <summary>
        /// Submit sales order invoice to FBR
        /// </summary>
        public async Task<FBRInvoiceResponse> SubmitInvoiceAsync(SalesOrder salesOrder)
        {
            // Load sales order with items and location
            var order = await _context.SalesOrders
                .Include(so => so.SalesOrderItems)
                    .ThenInclude(soi => soi.Product)
                .Include(so => so.Customer)
                .Include(so => so.SalesOrderPayments)
                .Include(so => so.Location)
                .FirstOrDefaultAsync(so => so.Id == salesOrder.Id);

            if (order == null)
            {
                throw new InvalidOperationException($"Sales order {salesOrder.Id} not found");
            }

            // Get FBR configuration from location
            var config = order.Location;

            if (config == null || !config.IsFBREnabled)
            {
                throw new InvalidOperationException("FBR is not configured or enabled for this location");
            }

            // Build FBR invoice request
            var request = BuildFBRInvoiceRequest(order, config);

            // Create submission log
            var log = new FBRSubmissionLog
            {
                Id = Guid.NewGuid(),
                SalesOrderId = order.Id,
                AttemptedAt = DateTime.UtcNow,
                RequestPayload = JsonSerializer.Serialize(request),
                SubmittedBy = "BackgroundWorker"
            };

            var stopwatch = Stopwatch.StartNew();

            try
            {
                // Set authorization header using FBRKey as static Bearer token
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", config.FBRKey);

                // Submit to FBR
                var apiEndpoint = $"{config.ApiBaseUrl}/api/v1/invoice";
                var response = await _httpClient.PostAsJsonAsync(apiEndpoint, request);

                stopwatch.Stop();
                log.ResponseTime = stopwatch.Elapsed;
                log.HttpStatusCode = (int)response.StatusCode;

                if (response.IsSuccessStatusCode)
                {
                    var fbrResponse = await response.Content.ReadFromJsonAsync<FBRInvoiceResponse>();

                    log.Status = FBRSubmissionStatus.Acknowledged;
                    log.ResponsePayload = JsonSerializer.Serialize(fbrResponse);

                    // Generate and save QR code
                    if (!string.IsNullOrEmpty(fbrResponse?.QRCodeData))
                    {
                        var qrCodePath = await _qrCodeService.GenerateQRCodeAsync(
                            fbrResponse.QRCodeData,
                            order.Id);

                        fbrResponse.QRCodeBase64 = qrCodePath; // Store path in response
                    }

                    _context.FBRSubmissionLogs.Add(log);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "Successfully submitted invoice {InvoiceId} to FBR. FBR Number: {FBRNumber}",
                        order.Id,
                        fbrResponse?.InvoiceNumber);

                    return fbrResponse;
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    log.Status = FBRSubmissionStatus.Failed;
                    log.ErrorMessage = errorContent;
                    log.ResponsePayload = errorContent;

                    _context.FBRSubmissionLogs.Add(log);
                    await _context.SaveChangesAsync();

                    _logger.LogError(
                        "FBR API returned {StatusCode}: {Error}",
                        response.StatusCode,
                        errorContent);

                    throw new Exception($"FBR API error: {errorContent}");
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                log.ResponseTime = stopwatch.Elapsed;
                log.Status = FBRSubmissionStatus.Failed;
                log.ErrorMessage = ex.Message;

                _context.FBRSubmissionLogs.Add(log);
                await _context.SaveChangesAsync();

                _logger.LogError(ex, "Error submitting invoice {InvoiceId} to FBR", order.Id);
                throw;
            }
        }

        /// <summary>
        /// Cancel FBR invoice
        /// </summary>
        public async Task<FBRCancelResponse> CancelInvoiceAsync(string fbrInvoiceNumber, string reason)
        {
            var order = await _context.SalesOrders
                .Include(so => so.Location)
                .FirstOrDefaultAsync(so => _context.FBRSubmissionLogs
                    .Any(l => l.SalesOrderId == so.Id && l.ResponsePayload.Contains(fbrInvoiceNumber)));

            if (order == null || order.Location == null || !order.Location.IsFBREnabled)
            {
                throw new InvalidOperationException("FBR is not configured or enabled for the associated location");
            }

            var config = order.Location;

            try
            {
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", config.FBRKey);

                var cancelRequest = new
                {
                    invoiceNumber = fbrInvoiceNumber,
                    reason = reason,
                    cancelledAt = DateTime.UtcNow
                };

                var apiEndpoint = $"{config.ApiBaseUrl}/api/v1/invoice/cancel";
                var response = await _httpClient.PostAsJsonAsync(apiEndpoint, cancelRequest);

                if (response.IsSuccessStatusCode)
                {
                    var cancelResponse = await response.Content.ReadFromJsonAsync<FBRCancelResponse>();
                    _logger.LogInformation("Cancelled FBR invoice {InvoiceNumber}", fbrInvoiceNumber);
                    return cancelResponse;
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Failed to cancel FBR invoice: {error}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling FBR invoice {InvoiceNumber}", fbrInvoiceNumber);
                throw;
            }
        }

        /// <summary>
        /// Verify FBR invoice
        /// </summary>
        public async Task<FBRVerificationResponse> VerifyInvoiceAsync(string fbrInvoiceNumber)
        {
             var order = await _context.SalesOrders
                .Include(so => so.Location)
                .FirstOrDefaultAsync(so => _context.FBRSubmissionLogs
                    .Any(l => l.SalesOrderId == so.Id && l.ResponsePayload.Contains(fbrInvoiceNumber)));

            if (order == null || order.Location == null || !order.Location.IsFBREnabled)
            {
                throw new InvalidOperationException("FBR is not configured or enabled for the associated location");
            }

            var config = order.Location;

            try
            {
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", config.FBRKey);

                var apiEndpoint = $"{config.ApiBaseUrl}/api/v1/invoice/verify/{fbrInvoiceNumber}";
                var response = await _httpClient.GetAsync(apiEndpoint);

                if (response.IsSuccessStatusCode)
                {
                    var verifyResponse = await response.Content.ReadFromJsonAsync<FBRVerificationResponse>();
                    return verifyResponse;
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Failed to verify FBR invoice: {error}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying FBR invoice {InvoiceNumber}", fbrInvoiceNumber);
                throw;
            }
        }

        /// <summary>
        /// Build FBR invoice request from sales order
        /// </summary>
        private FBRInvoiceRequest BuildFBRInvoiceRequest(SalesOrder salesOrder, Data.Entities.Location config)
        {
            // Determine payment mode (1=Cash, 2=Card, 3=Gift Voucher, 4=Loyalty Card, 5=Mixed, 6=Cheque)
            int paymentMode = 1; // Default Cash
            if (salesOrder.SalesOrderPayments?.Any() == true)
            {
                var payment = salesOrder.SalesOrderPayments.First();
                paymentMode = payment.PaymentMethod switch
                {
                    ACCPaymentMethod.Cash => 1,
                    ACCPaymentMethod.DebitCard => 2,
                    ACCPaymentMethod.CreditCard => 2,
                    ACCPaymentMethod.Cheque => 6,
                    _ => 1
                };
            }

            int invoiceType = salesOrder.Status == SalesOrderStatus.Return ? 3 : 1;
            long posId = 0;
            long.TryParse(config.POSID, out posId);

            return new FBRInvoiceRequest
            {
                InvoiceNumber = salesOrder.OrderNumber,
                InvoiceType = invoiceType,
                DateTime = salesOrder.SOCreatedDate,
                POSID = posId,
                USIN = salesOrder.OrderNumber, // Unique sequence number
                BuyerNTN = salesOrder.BuyerNTN,
                BuyerCNIC = salesOrder.BuyerCNIC,
                BuyerName = salesOrder.BuyerName ?? salesOrder.Customer?.CustomerName ?? "Walk-in Customer",
                BuyerPhoneNumber = salesOrder.BuyerPhoneNumber ?? salesOrder.Customer?.MobileNo,
                TotalSaleValue = (double)(salesOrder.TotalAmount - salesOrder.TotalTax),
                TotalTaxCharged = (double)salesOrder.TotalTax,
                Discount = (double)salesOrder.TotalDiscount,
                FurtherTax = 0,
                TotalBillAmount = (double)salesOrder.TotalAmount,
                PaymentMode = paymentMode,
                RefUSIN = null, // For returns, this would reference original invoice
                Items = salesOrder.SalesOrderItems?.Select(item => new FBRInvoiceItem
                {
                    ItemCode = item.Product?.Code ?? item.ProductId.ToString(),
                    ItemName = item.Product?.Name ?? "Unknown Product",
                    Quantity = (double)item.Quantity,
                    PCTCode = "00000000", 
                    TaxRate = item.UnitPrice > 0 ? (double)(item.TaxValue / item.UnitPrice * 100) : 0,
                    SaleValue = (double)(item.UnitPrice * item.Quantity),
                    TaxCharged = (double)(item.TaxValue * item.Quantity),
                    Discount = (double)item.Discount,
                    FurtherTax = 0,
                    TotalAmount = (double)((item.UnitPrice * item.Quantity) + (item.TaxValue * item.Quantity) - item.Discount),
                    InvoiceType = invoiceType
                }).ToList() ?? new System.Collections.Generic.List<FBRInvoiceItem>()
            };
        }
    }
}
