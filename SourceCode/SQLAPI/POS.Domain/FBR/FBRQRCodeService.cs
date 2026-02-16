using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using QRCoder;
using System;
using System.IO;
using System.Threading.Tasks;

namespace POS.Domain.FBR
{
    /// <summary>
    /// Service for generating FBR invoice QR codes
    /// </summary>
    public class FBRQRCodeService : IFBRQRCodeService
    {
        private readonly ILogger<FBRQRCodeService> _logger;
        private readonly string _qrCodeDirectory;
        private readonly string _baseUrlPath; // For constructing relative URLs

        public FBRQRCodeService(ILogger<FBRQRCodeService> logger, IWebHostEnvironment environment)
        {
            _logger = logger;
            
            if (environment.IsEnvironment("Desktop"))
            {
                // In Desktop mode, write to AppData to avoid permission issues
                var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "milpos");
                _qrCodeDirectory = Path.Combine(appDataPath, "qrcodes");
                
                // For desktop, we might need a different strategy for serving these files if they aren't in wwwroot
                // But for now, let's ensure we can write them.
                // If the frontend needs to display them, we might need to expose them via a controller or custom file provider.
                // However, if the frontend is also running from resources, it might not have direct access to AppData.
                // A common pattern is to serve them via an API endpoint that reads the file.
                _baseUrlPath = "/qrcodes"; 
            }
            else
            {
                // In Web mode, use standard wwwroot
                string webRootPath = environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                _qrCodeDirectory = Path.Combine(webRootPath, "qrcodes");
                _baseUrlPath = "/qrcodes";
            }
            
            // Ensure directory exists
            if (!Directory.Exists(_qrCodeDirectory))
            {
                Directory.CreateDirectory(_qrCodeDirectory);
            }
        }

        /// <summary>
        /// Generate QR code from FBR data and save as image
        /// </summary>
        public async Task<string> GenerateQRCodeAsync(string qrData, Guid invoiceId)
        {
            try
            {
                _logger.LogInformation("Generating QR code for invoice {InvoiceId}", invoiceId);

                // Generate QR code using QRCoder library
                using (var qrGenerator = new QRCodeGenerator())
                {
                    var qrCodeData = qrGenerator.CreateQrCode(qrData, QRCodeGenerator.ECCLevel.Q);
                    
                    // Use PngByteQRCode to generate PNG image
                    using (var qrCode = new PngByteQRCode(qrCodeData))
                    {
                        byte[] qrCodeBytes = qrCode.GetGraphic(20);
                        
                        // Save to file
                        var fileName = $"{invoiceId}.png";
                        var filePath = Path.Combine(_qrCodeDirectory, fileName);
                        
                        await File.WriteAllBytesAsync(filePath, qrCodeBytes);
                        
                        await File.WriteAllBytesAsync(filePath, qrCodeBytes);
                        
                        // Return relative path for web access
                        // Note: For desktop, this path might need to be intercepted or served via a specific endpoint
                        var relativePath = $"{_baseUrlPath}/{fileName}";
                        
                        _logger.LogInformation("QR code saved to {Path}", relativePath);
                        
                        return relativePath;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating QR code for invoice {InvoiceId}", invoiceId);
                throw;
            }
        }

        /// <summary>
        /// Get QR code image path for an invoice
        /// </summary>
        public string GetQRCodeImagePath(Guid invoiceId)
        {
            return $"{_baseUrlPath}/{invoiceId}.png";
        }

        /// <summary>
        /// Delete QR code image for an invoice
        /// </summary>
        public async Task DeleteQRCodeAsync(Guid invoiceId)
        {
            try
            {
                var fileName = $"{invoiceId}.png";
                var filePath = Path.Combine(_qrCodeDirectory, fileName);
                
                if (File.Exists(filePath))
                {
                    await Task.Run(() => File.Delete(filePath));
                    _logger.LogInformation("Deleted QR code for invoice {InvoiceId}", invoiceId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting QR code for invoice {InvoiceId}", invoiceId);
                // Don't throw - deletion failure shouldn't break the flow
            }
        }
    }
}
