using System;
using System.Threading.Tasks;

namespace POS.Domain.FBR
{
    /// <summary>
    /// Service interface for generating and managing FBR QR codes
    /// </summary>
    public interface IFBRQRCodeService
    {
        /// <summary>
        /// Generate QR code image from FBR data and save to disk
        /// </summary>
        /// <param name="qrData">QR code data string</param>
        /// <param name="invoiceId">Invoice ID for filename</param>
        /// <returns>Relative path to saved QR code image</returns>
        Task<string> GenerateQRCodeAsync(string qrData, Guid invoiceId);

        /// <summary>
        /// Get QR code image path for an invoice
        /// </summary>
        /// <param name="invoiceId">Invoice ID</param>
        /// <returns>Relative path to QR code image</returns>
        string GetQRCodeImagePath(Guid invoiceId);

        /// <summary>
        /// Delete QR code image for an invoice
        /// </summary>
        /// <param name="invoiceId">Invoice ID</param>
        Task DeleteQRCodeAsync(Guid invoiceId);
    }
}
