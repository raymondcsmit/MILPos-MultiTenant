using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Domain.ImportExport;

namespace POS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImportExportController : ControllerBase
    {
        private readonly IImportExportService<POS.Data.Product> _productService;
        private readonly IImportExportService<POS.Data.Customer> _customerService;
        private readonly IImportExportService<POS.Data.Supplier> _supplierService;
        private readonly ILogger<ImportExportController> _logger;

        public ImportExportController(
            IImportExportService<POS.Data.Product> productService,
            IImportExportService<POS.Data.Customer> customerService,
            IImportExportService<POS.Data.Supplier> supplierService,
            ILogger<ImportExportController> logger)
        {
            _productService = productService;
            _customerService = customerService;
            _supplierService = supplierService;
            _logger = logger;
        }

        #region Product Endpoints

        [HttpPost("products/import")]
        public async Task<IActionResult> ImportProducts(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file uploaded" });

            try
            {
                var format = Path.GetExtension(file.FileName).ToLower() == ".csv"
                    ? FileFormat.CSV
                    : FileFormat.Excel;

                using var stream = file.OpenReadStream();
                var result = await _productService.ImportAsync(stream, format);

                return Ok(new
                {
                    success = result.IsSuccess,
                    totalRecords = result.TotalRecords,
                    successCount = result.SuccessCount,
                    failureCount = result.FailureCount,
                    errors = result.Errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing products");
                return StatusCode(500, new { error = "Import failed", message = ex.Message });
            }
        }

        [HttpPost("products/validate")]
        public async Task<IActionResult> ValidateProducts(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file uploaded" });

            try
            {
                var format = Path.GetExtension(file.FileName).ToLower() == ".csv"
                    ? FileFormat.CSV
                    : FileFormat.Excel;

                using var stream = file.OpenReadStream();
                var result = await _productService.ValidateImportAsync(stream, format);

                return Ok(new
                {
                    success = result.IsSuccess,
                    totalRecords = result.TotalRecords,
                    successCount = result.SuccessCount,
                    failureCount = result.FailureCount,
                    errors = result.Errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating products");
                return StatusCode(500, new { error = "Validation failed", message = ex.Message });
            }
        }

        [HttpGet("products/export")]
        public async Task<IActionResult> ExportProducts([FromQuery] string format = "csv")
        {
            try
            {
                var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
                var options = new ExportOptions { ExportAll = true };

                var fileBytes = await _productService.ExportAsync(options, fileFormat);
                var fileName = $"Products_{DateTime.Now:yyyyMMdd}.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
                var contentType = fileFormat == FileFormat.CSV
                    ? "text/csv"
                    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting products");
                return StatusCode(500, new { error = "Export failed", message = ex.Message });
            }
        }

        [HttpGet("products/template")]
        public async Task<IActionResult> GetProductTemplate([FromQuery] string format = "csv")
        {
            try
            {
                var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
                var fileBytes = await _productService.GenerateTemplateAsync(fileFormat);
                var fileName = $"Product_Template.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
                var contentType = fileFormat == FileFormat.CSV
                    ? "text/csv"
                    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating product template");
                return StatusCode(500, new { error = "Template generation failed", message = ex.Message });
            }
        }

        #endregion

        #region Customer Endpoints

        [HttpPost("customers/import")]
        public async Task<IActionResult> ImportCustomers(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file uploaded" });

            try
            {
                var format = Path.GetExtension(file.FileName).ToLower() == ".csv" ? FileFormat.CSV : FileFormat.Excel;
                using var stream = file.OpenReadStream();
                var result = await _customerService.ImportAsync(stream, format);

                return Ok(new
                {
                    success = result.IsSuccess,
                    totalRecords = result.TotalRecords,
                    successCount = result.SuccessCount,
                    failureCount = result.FailureCount,
                    errors = result.Errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing customers");
                return StatusCode(500, new { error = "Import failed", message = ex.Message });
            }
        }

        [HttpGet("customers/export")]
        public async Task<IActionResult> ExportCustomers([FromQuery] string format = "csv")
        {
            try
            {
                var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
                var options = new ExportOptions { ExportAll = true };
                var fileBytes = await _customerService.ExportAsync(options, fileFormat);
                var fileName = $"Customers_{DateTime.Now:yyyyMMdd}.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
                var contentType = fileFormat == FileFormat.CSV ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting customers");
                return StatusCode(500, new { error = "Export failed", message = ex.Message });
            }
        }

        [HttpGet("customers/template")]
        public async Task<IActionResult> GetCustomerTemplate([FromQuery] string format = "csv")
        {
            try
            {
                var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
                var fileBytes = await _customerService.GenerateTemplateAsync(fileFormat);
                var fileName = $"Customer_Template.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
                var contentType = fileFormat == FileFormat.CSV ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating customer template");
                return StatusCode(500, new { error = "Template generation failed", message = ex.Message });
            }
        }

        #endregion

        #region Supplier Endpoints

        [HttpPost("suppliers/import")]
        public async Task<IActionResult> ImportSuppliers(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file uploaded" });

            try
            {
                var format = Path.GetExtension(file.FileName).ToLower() == ".csv" ? FileFormat.CSV : FileFormat.Excel;
                using var stream = file.OpenReadStream();
                var result = await _supplierService.ImportAsync(stream, format);

                return Ok(new
                {
                    success = result.IsSuccess,
                    totalRecords = result.TotalRecords,
                    successCount = result.SuccessCount,
                    failureCount = result.FailureCount,
                    errors = result.Errors
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing suppliers");
                return StatusCode(500, new { error = "Import failed", message = ex.Message });
            }
        }

        [HttpGet("suppliers/export")]
        public async Task<IActionResult> ExportSuppliers([FromQuery] string format = "csv")
        {
            try
            {
                var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
                var options = new ExportOptions { ExportAll = true };
                var fileBytes = await _supplierService.ExportAsync(options, fileFormat);
                var fileName = $"Suppliers_{DateTime.Now:yyyyMMdd}.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
                var contentType = fileFormat == FileFormat.CSV ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting suppliers");
                return StatusCode(500, new { error = "Export failed", message = ex.Message });
            }
        }

        [HttpGet("suppliers/template")]
        public async Task<IActionResult> GetSupplierTemplate([FromQuery] string format = "csv")
        {
            try
            {
                var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
                var fileBytes = await _supplierService.GenerateTemplateAsync(fileFormat);
                var fileName = $"Supplier_Template.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
                var contentType = fileFormat == FileFormat.CSV ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating supplier template");
                return StatusCode(500, new { error = "Template generation failed", message = ex.Message });
            }
        }

        #endregion
    }
}
