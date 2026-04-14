using POS.Data;
using POS.Domain.FBR.DTOs;
using System;
using System.Threading.Tasks;

namespace POS.Domain.FBR
{
    /// <summary>
    /// Main service interface for FBR invoice operations
    /// </summary>
    public interface IFBRInvoiceService
    {
        /// <summary>
        /// Submit invoice to FBR API
        /// </summary>
        /// <param name="salesOrder">Sales order to submit</param>
        /// <returns>FBR response with invoice number and QR code</returns>
        Task<FBRInvoiceResponse> SubmitInvoiceAsync(SalesOrder salesOrder);

        /// <summary>
        /// Cancel/void an FBR invoice
        /// </summary>
        /// <param name="fbrInvoiceNumber">FBR invoice number to cancel</param>
        /// <param name="reason">Cancellation reason</param>
        /// <returns>Cancellation response</returns>
        Task<FBRCancelResponse> CancelInvoiceAsync(string fbrInvoiceNumber, string reason);

        /// <summary>
        /// Verify invoice status with FBR
        /// </summary>
        /// <param name="fbrInvoiceNumber">FBR invoice number to verify</param>
        /// <returns>Verification response</returns>
        Task<FBRVerificationResponse> VerifyInvoiceAsync(string fbrInvoiceNumber);
    }
}
