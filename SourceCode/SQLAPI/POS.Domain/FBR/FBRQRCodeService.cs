using Microsoft.Extensions.Logging;
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

        public FBRQRCodeService(ILogger<FBRQRCodeService> logger)
        {
            _logger = logger;
            // QR codes will be saved in wwwroot/qrcodes/
            _qrCodeDirectory = Path.Combine("wwwroot", "qrcodes");
            
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
                        
                        // Return relative path for web access
                        var relativePath = $"/qrcodes/{fileName}";
                        
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
            return $"/qrcodes/{invoiceId}.png";
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
