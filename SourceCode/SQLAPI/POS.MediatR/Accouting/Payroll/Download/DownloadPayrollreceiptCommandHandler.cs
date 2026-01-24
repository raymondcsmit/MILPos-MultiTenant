using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class DownloadPayrollreceiptCommandHandler(
         IWebHostEnvironment _webHostEnvironment,
     PathHelper _pathHelper,
     ILogger<DownloadPayrollreceiptCommandHandler> _logger) : IRequestHandler<DownloadPayrollreceiptCommand,string>
    {
        public async Task<string> Handle(DownloadPayrollreceiptCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var fullPath = Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.DocumentPath, request.AttachmentName);
                if (string.IsNullOrEmpty(request.AttachmentName))
                {
                    return string.Empty;
                }

                return fullPath;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while downloading payroll Receipt");
                return "Error while downloading payroll Receipt";
            }
        }

       
    }
}
