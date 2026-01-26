using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Dto; // Add for UserInfoToken
using POS.Domain;
using POS.Domain.ImportExport.DTOs;

namespace POS.Domain.ImportExport
{
    public class SupplierImportExportService : IImportExportService<Supplier>
    {
        private readonly POSDbContext _context;
        private readonly ILogger<SupplierImportExportService> _logger;
        private readonly ITenantProvider _tenantProvider;
        private readonly UserInfoToken _userInfoToken;

        public SupplierImportExportService(
            POSDbContext context, 
            ILogger<SupplierImportExportService> logger, 
            ITenantProvider tenantProvider,
            UserInfoToken userInfoToken)
        {
            _context = context;
            _logger = logger;
            _tenantProvider = tenantProvider;
            _userInfoToken = userInfoToken;
        }

        public async Task<byte[]> GenerateTemplateAsync(FileFormat format)
        {
            return format == FileFormat.CSV 
                ? await GenerateCsvTemplateAsync() 
                : await GenerateExcelTemplateAsync();
        }

        public async Task<ImportResult<Supplier>> ImportAsync(Stream fileStream, FileFormat format)
        {
            var result = new ImportResult<Supplier>();

            try
            {
                var records = format == FileFormat.CSV
                    ? await ParseCsvAsync(fileStream)
                    : await ParseExcelAsync(fileStream);

                result.TotalRecords = records.Count;

                foreach (var (record, index) in records.Select((r, i) => (r, i)))
                {
                    var rowNumber = index + 2;
                    var validation = await ValidateSupplierAsync(record, rowNumber);

                    if (validation.IsValid)
                    {
                        var supplier = await MapToSupplierAsync(record);
                        _context.Suppliers.Add(supplier);
                        result.SuccessfulRecords.Add(supplier);
                        result.SuccessCount++;
                    }
                    else
                    {
                        result.Errors.AddRange(validation.Errors);
                        result.FailureCount++;
                    }
                }

                if (result.FailureCount == 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully imported {Count} suppliers", result.SuccessCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during supplier import");
                result.Errors.Add(new ImportError
                {
                    RowNumber = 0,
                    FieldName = "General",
                    ErrorMessage = $"Import failed: {ex.Message}"
                });
            }

            return result;
        }

        public async Task<ImportResult<Supplier>> ValidateImportAsync(Stream fileStream, FileFormat format)
        {
            var result = new ImportResult<Supplier>();

            try
            {
                var records = format == FileFormat.CSV
                    ? await ParseCsvAsync(fileStream)
                    : await ParseExcelAsync(fileStream);

                result.TotalRecords = records.Count;

                foreach (var (record, index) in records.Select((r, i) => (r, i)))
                {
                    var rowNumber = index + 2;
                    var validation = await ValidateSupplierAsync(record, rowNumber);

                    if (validation.IsValid)
                        result.SuccessCount++;
                    else
                    {
                        result.Errors.AddRange(validation.Errors);
                        result.FailureCount++;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during supplier validation");
            }

            return result;
        }

        public async Task<byte[]> ExportAsync(ExportOptions options, FileFormat format)
        {
            var query = _context.Suppliers
                .Include(s => s.BillingAddress)
                .Include(s => s.ShippingAddress)
                .Where(s => !s.IsDeleted)
                .AsQueryable();

            if (options.SelectedIds != null && options.SelectedIds.Any())
                query = query.Where(s => options.SelectedIds.Contains(s.Id));

            var suppliers = await query.ToListAsync();

            return format == FileFormat.CSV
                ? await ExportToCsvAsync(suppliers)
                : await ExportToExcelAsync(suppliers);
        }

        #region CSV Methods

        private async Task<List<SupplierImportDto>> ParseCsvAsync(Stream fileStream)
        {
            using var reader = new StreamReader(fileStream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            });

            var records = csv.GetRecords<SupplierImportDto>().ToList();
            return await Task.FromResult(records);
        }

        private async Task<byte[]> GenerateCsvTemplateAsync()
        {
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            csv.WriteField("Supplier Name");
            csv.WriteField("Contact Person");
            csv.WriteField("Email");
            csv.WriteField("Mobile No");
            csv.WriteField("Phone No");
            csv.WriteField("Website");
            csv.WriteField("Tax Number");
            csv.WriteField("Billing Address");
            csv.WriteField("Billing City");
            csv.WriteField("Billing Country");
            csv.WriteField("Shipping Address");
            csv.WriteField("Shipping City");
            csv.WriteField("Shipping Country");
            csv.WriteField("Description");
            csv.NextRecord();

            csv.WriteField("ABC Suppliers Ltd");
            csv.WriteField("Ahmed Ali");
            csv.WriteField("info@abc.com");
            csv.WriteField("+92-321-9876543");
            csv.WriteField("042-98765432");
            csv.WriteField("www.abc.com");
            csv.WriteField("9876543-2");
            csv.WriteField("456 Industrial Area");
            csv.WriteField("Karachi");
            csv.WriteField("Pakistan");
            csv.WriteField("456 Industrial Area");
            csv.WriteField("Karachi");
            csv.WriteField("Pakistan");
            csv.WriteField("Preferred supplier");
            csv.NextRecord();

            await writer.FlushAsync();
            return memoryStream.ToArray();
        }

        private async Task<byte[]> ExportToCsvAsync(List<Supplier> suppliers)
        {
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            csv.WriteField("Supplier Name");
            csv.WriteField("Contact Person");
            csv.WriteField("Email");
            csv.WriteField("Mobile No");
            csv.WriteField("Phone No");
            csv.WriteField("Website");
            csv.WriteField("Tax Number");
            csv.WriteField("Billing Address");
            csv.WriteField("Billing City");
            csv.WriteField("Billing Country");
            csv.WriteField("Shipping Address");
            csv.WriteField("Shipping City");
            csv.WriteField("Shipping Country");
            csv.WriteField("Description");
            csv.NextRecord();

            foreach (var supplier in suppliers)
            {
                csv.WriteField(supplier.SupplierName);
                csv.WriteField(supplier.ContactPerson);
                csv.WriteField(supplier.Email);
                csv.WriteField(supplier.MobileNo);
                csv.WriteField(supplier.PhoneNo);
                csv.WriteField(supplier.Website);
                csv.WriteField(supplier.TaxNumber);
                csv.WriteField(supplier.BillingAddress?.Address);
                csv.WriteField(supplier.BillingAddress?.CityName);
                csv.WriteField(supplier.BillingAddress?.CountryName);
                csv.WriteField(supplier.ShippingAddress?.Address);
                csv.WriteField(supplier.ShippingAddress?.CityName);
                csv.WriteField(supplier.ShippingAddress?.CountryName);
                csv.WriteField(supplier.Description);
                csv.NextRecord();
            }

            await writer.FlushAsync();
            return memoryStream.ToArray();
        }

        #endregion

        #region Excel Methods

        private async Task<List<SupplierImportDto>> ParseExcelAsync(Stream fileStream)
        {
            var records = new List<SupplierImportDto>();

            using var package = new ExcelPackage(fileStream);
            var worksheet = package.Workbook.Worksheets.FirstOrDefault(w => w.Name == "Suppliers");

            if (worksheet == null)
                throw new Exception("Suppliers worksheet not found");

            var rowCount = worksheet.Dimension?.Rows ?? 0;

            for (int row = 2; row <= rowCount; row++)
            {
                if (string.IsNullOrWhiteSpace(worksheet.Cells[row, 1].Text))
                    continue;

                var record = new SupplierImportDto
                {
                    SupplierName = worksheet.Cells[row, 1].Text,
                    ContactPerson = worksheet.Cells[row, 2].Text,
                    Email = worksheet.Cells[row, 3].Text,
                    MobileNo = worksheet.Cells[row, 4].Text,
                    PhoneNo = worksheet.Cells[row, 5].Text,
                    Website = worksheet.Cells[row, 6].Text,
                    TaxNumber = worksheet.Cells[row, 7].Text,
                    BillingAddress = worksheet.Cells[row, 8].Text,
                    BillingCity = worksheet.Cells[row, 9].Text,
                    BillingCountry = worksheet.Cells[row, 10].Text,
                    ShippingAddress = worksheet.Cells[row, 11].Text,
                    ShippingCity = worksheet.Cells[row, 12].Text,
                    ShippingCountry = worksheet.Cells[row, 13].Text,
                    Description = worksheet.Cells[row, 14].Text
                };

                records.Add(record);
            }

            return await Task.FromResult(records);
        }

        private async Task<byte[]> GenerateExcelTemplateAsync()
        {
            using var package = new ExcelPackage();

            var instructionsSheet = package.Workbook.Worksheets.Add("Instructions");
            instructionsSheet.Cells["A1"].Value = "Supplier Import Template";
            instructionsSheet.Cells["A1"].Style.Font.Size = 16;
            instructionsSheet.Cells["A1"].Style.Font.Bold = true;

            instructionsSheet.Cells["A3"].Value = "Instructions:";
            instructionsSheet.Cells["A4"].Value = "1. Fill in the 'Suppliers' sheet with your data";
            instructionsSheet.Cells["A5"].Value = "2. Required fields are marked with * in header";
            instructionsSheet.Cells["A6"].Value = "3. Billing Address, City, and Country are required";

            var suppliersSheet = package.Workbook.Worksheets.Add("Suppliers");

            var headers = new[] { "Supplier Name*", "Contact Person", "Email", "Mobile No*",
                                  "Phone No", "Website", "Tax Number", "Billing Address*",
                                  "Billing City*", "Billing Country*", "Shipping Address",
                                  "Shipping City", "Shipping Country", "Description" };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = suppliersSheet.Cells[1, i + 1];
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightCoral);
            }

            suppliersSheet.Cells["A2"].Value = "ABC Suppliers Ltd";
            suppliersSheet.Cells["B2"].Value = "Ahmed Ali";
            suppliersSheet.Cells["C2"].Value = "info@abc.com";
            suppliersSheet.Cells["D2"].Value = "+92-321-9876543";
            suppliersSheet.Cells["E2"].Value = "042-98765432";
            suppliersSheet.Cells["F2"].Value = "www.abc.com";
            suppliersSheet.Cells["G2"].Value = "9876543-2";
            suppliersSheet.Cells["H2"].Value = "456 Industrial Area";
            suppliersSheet.Cells["I2"].Value = "Karachi";
            suppliersSheet.Cells["J2"].Value = "Pakistan";
            suppliersSheet.Cells["K2"].Value = "456 Industrial Area";
            suppliersSheet.Cells["L2"].Value = "Karachi";
            suppliersSheet.Cells["M2"].Value = "Pakistan";
            suppliersSheet.Cells["N2"].Value = "Preferred supplier";

            suppliersSheet.Cells.AutoFitColumns();

            return await Task.FromResult(package.GetAsByteArray());
        }

        private async Task<byte[]> ExportToExcelAsync(List<Supplier> suppliers)
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Suppliers");

            var headers = new[] { "Supplier Name", "Contact Person", "Email", "Mobile No",
                                  "Phone No", "Website", "Tax Number", "Billing Address",
                                  "Billing City", "Billing Country", "Shipping Address",
                                  "Shipping City", "Shipping Country", "Description" };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cells[1, i + 1];
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }

            int row = 2;
            foreach (var supplier in suppliers)
            {
                worksheet.Cells[row, 1].Value = supplier.SupplierName;
                worksheet.Cells[row, 2].Value = supplier.ContactPerson;
                worksheet.Cells[row, 3].Value = supplier.Email;
                worksheet.Cells[row, 4].Value = supplier.MobileNo;
                worksheet.Cells[row, 5].Value = supplier.PhoneNo;
                worksheet.Cells[row, 6].Value = supplier.Website;
                worksheet.Cells[row, 7].Value = supplier.TaxNumber;
                worksheet.Cells[row, 8].Value = supplier.BillingAddress?.Address;
                worksheet.Cells[row, 9].Value = supplier.BillingAddress?.CityName;
                worksheet.Cells[row, 10].Value = supplier.BillingAddress?.CountryName;
                worksheet.Cells[row, 11].Value = supplier.ShippingAddress?.Address;
                worksheet.Cells[row, 12].Value = supplier.ShippingAddress?.CityName;
                worksheet.Cells[row, 13].Value = supplier.ShippingAddress?.CountryName;
                worksheet.Cells[row, 14].Value = supplier.Description;
                row++;
            }

            worksheet.Cells.AutoFitColumns();

            return await Task.FromResult(package.GetAsByteArray());
        }

        #endregion

        #region Validation

        private async Task<(bool IsValid, List<ImportError> Errors)> ValidateSupplierAsync(SupplierImportDto dto, int rowNumber)
        {
            var errors = new List<ImportError>();

            if (string.IsNullOrWhiteSpace(dto.SupplierName))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Supplier Name", ErrorMessage = "Supplier Name is required" });

            if (string.IsNullOrWhiteSpace(dto.MobileNo))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Mobile No", ErrorMessage = "Mobile No is required" });

            if (string.IsNullOrWhiteSpace(dto.BillingAddress))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Billing Address", ErrorMessage = "Billing Address is required" });

            if (string.IsNullOrWhiteSpace(dto.BillingCity))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Billing City", ErrorMessage = "Billing City is required" });

            if (string.IsNullOrWhiteSpace(dto.BillingCountry))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Billing Country", ErrorMessage = "Billing Country is required" });

            if (!string.IsNullOrWhiteSpace(dto.Email) && !IsValidEmail(dto.Email))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Email", ErrorMessage = "Invalid email format" });

            // Duplicate check
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var exists = await _context.Suppliers.AnyAsync(s => s.Email == dto.Email && !s.IsDeleted);
                if (exists)
                    errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Email", ErrorMessage = $"Supplier with email '{dto.Email}' already exists" });
            }

            return (errors.Count == 0, errors);
        }

        private async Task<Supplier> MapToSupplierAsync(SupplierImportDto dto)
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
            {
                throw new Exception("Tenant ID not found. Cannot import supplier.");
            }

            var userId = _userInfoToken.Id;

            // Create billing address (required)
            var billingAddress = new SupplierAddress
            {
                Id = Guid.NewGuid(),
                Address = dto.BillingAddress,
                CityName = dto.BillingCity,
                CountryName = dto.BillingCountry,
                IsDeleted = false
            };
            // _context.SupplierAddresses.Add(billingAddress); // Removed explicit Add, rely on navigation

            // Create shipping address (use billing if not provided)
            var shippingAddress = new SupplierAddress
            {
                Id = Guid.NewGuid(),
                Address = string.IsNullOrWhiteSpace(dto.ShippingAddress) ? dto.BillingAddress : dto.ShippingAddress,
                CityName = string.IsNullOrWhiteSpace(dto.ShippingCity) ? dto.BillingCity : dto.ShippingCity,
                CountryName = string.IsNullOrWhiteSpace(dto.ShippingCountry) ? dto.BillingCountry : dto.ShippingCountry,
                IsDeleted = false
            };
            // _context.SupplierAddresses.Add(shippingAddress); // Removed explicit Add

            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId.Value,
                SupplierName = dto.SupplierName,
                ContactPerson = dto.ContactPerson,
                Email = dto.Email,
                MobileNo = dto.MobileNo,
                PhoneNo = dto.PhoneNo,
                Website = dto.Website,
                TaxNumber = dto.TaxNumber,
                Description = dto.Description,
                BillingAddress = billingAddress,   // Navigation Property
                ShippingAddress = shippingAddress, // Navigation Property
                IsDeleted = false,
                CreatedBy = userId,
                ModifiedBy = userId,
                CreatedDate = DateTime.UtcNow,
                ModifiedDate = DateTime.UtcNow
            };

            return await Task.FromResult(supplier);
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        #endregion
    }
}
