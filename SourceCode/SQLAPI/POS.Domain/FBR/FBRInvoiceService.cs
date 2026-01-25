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
        private readonly IFBRAuthenticationService _authService;
        private readonly IFBRQRCodeService _qrCodeService;

        public FBRInvoiceService(
            POSDbContext context,
            HttpClient httpClient,
            ILogger<FBRInvoiceService> logger,
            IFBRAuthenticationService authService,
            IFBRQRCodeService qrCodeService)
        {
            _context = context;
            _httpClient = httpClient;
            _logger = logger;
            _authService = authService;
            _qrCodeService = qrCodeService;
        }

        /// <summary>
        /// Submit sales order invoice to FBR
        /// </summary>
        public async Task<FBRInvoiceResponse> SubmitInvoiceAsync(SalesOrder salesOrder)
        {
            // Get FBR configuration
            var config = await _context.FBRConfigurations
                .FirstOrDefaultAsync(c => c.IsEnabled);

            if (config == null)
            {
                throw new InvalidOperationException("FBR is not configured or enabled");
            }

            // Load sales order with items
            var order = await _context.SalesOrders
                .Include(so => so.SalesOrderItems)
                    .ThenInclude(soi => soi.Product)
                .Include(so => so.Customer)
                .Include(so => so.SalesOrderPayments)
                .FirstOrDefaultAsync(so => so.Id == salesOrder.Id);

            if (order == null)
            {
                throw new InvalidOperationException($"Sales order {salesOrder.Id} not found");
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
                // Get access token
                var token = await _authService.GetAccessTokenAsync();

                // Set authorization header
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

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
                    if (!string.IsNullOrEmpty(fbrResponse.QRCodeData))
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
                        fbrResponse.InvoiceNumber);

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
            var config = await _context.FBRConfigurations
                .FirstOrDefaultAsync(c => c.IsEnabled);

            if (config == null)
            {
                throw new InvalidOperationException("FBR is not configured or enabled");
            }

            try
            {
                var token = await _authService.GetAccessTokenAsync();
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

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
            var config = await _context.FBRConfigurations
                .FirstOrDefaultAsync(c => c.IsEnabled);

            if (config == null)
            {
                throw new InvalidOperationException("FBR is not configured or enabled");
            }

            try
            {
                var token = await _authService.GetAccessTokenAsync();
                _httpClient.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

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
        private FBRInvoiceRequest BuildFBRInvoiceRequest(SalesOrder salesOrder, Data.Entities.FBR.FBRConfiguration config)
        {
            // Determine payment mode
            var paymentMode = "Cash"; // Default
            if (salesOrder.SalesOrderPayments?.Any() == true)
            {
                var payment = salesOrder.SalesOrderPayments.First();
                paymentMode = payment.PaymentMethod.ToString();
            }

            return new FBRInvoiceRequest
            {
                InvoiceNumber = salesOrder.OrderNumber,
                InvoiceType = salesOrder.Status == SalesOrderStatus.Return ? "Return" : "Sale",
                InvoiceDate = salesOrder.SOCreatedDate,
                POSID = config.POSID,
                BranchCode = config.BranchCode,
                BuyerNTN = salesOrder.BuyerNTN,
                BuyerCNIC = salesOrder.BuyerCNIC,
                BuyerName = salesOrder.BuyerName ?? salesOrder.Customer?.CustomerName ?? "Walk-in Customer",
                BuyerPhoneNumber = salesOrder.BuyerPhoneNumber ?? salesOrder.Customer?.MobileNo,
                TotalSaleValue = salesOrder.TotalAmount - salesOrder.TotalTax,
                TotalTaxCharged = salesOrder.TotalTax,
                TotalQuantity = (int)(salesOrder.SalesOrderItems?.Sum(i => i.Quantity) ?? 0),
                PaymentMode = paymentMode,
                RefUSIN = null, // For returns, this would reference original invoice
                Items = salesOrder.SalesOrderItems?.Select(item => new FBRInvoiceItem
                {
                    ItemCode = item.Product?.Code ?? item.ProductId.ToString(),
                    ItemName = item.Product?.Name ?? "Unknown Product",
                    Quantity = (int)item.Quantity,
                    PCTCode = "00000000", // TODO: Add PCTCode to Product entity
                    TaxRate = item.UnitPrice > 0 ? (decimal)(item.TaxValue / item.UnitPrice * 100) : 0,
                    SaleValue = item.UnitPrice * item.Quantity,
                    TaxCharged = item.TaxValue * item.Quantity,
                    Discount = item.Discount,
                    FurtherTax = 0, // Additional tax if applicable
                    TotalAmount = (item.UnitPrice * item.Quantity) + (item.TaxValue * item.Quantity) - item.Discount
                }).ToList() ?? new System.Collections.Generic.List<FBRInvoiceItem>()
            };
        }
    }
}
