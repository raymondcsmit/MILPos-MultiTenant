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
using POS.Domain.ImportExport.DTOs;

namespace POS.Domain.ImportExport
{
    public class CustomerImportExportService : IImportExportService<Customer>
    {
        private readonly POSDbContext _context;
        private readonly ILogger<CustomerImportExportService> _logger;

        public CustomerImportExportService(POSDbContext context, ILogger<CustomerImportExportService> logger)
        {
            _context = context;
            _logger = logger;
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        }

        public async Task<byte[]> GenerateTemplateAsync(FileFormat format)
        {
            return format == FileFormat.CSV 
                ? await GenerateCsvTemplateAsync() 
                : await GenerateExcelTemplateAsync();
        }

        public async Task<ImportResult<Customer>> ImportAsync(Stream fileStream, FileFormat format)
        {
            var result = new ImportResult<Customer>();

            try
            {
                var records = format == FileFormat.CSV
                    ? await ParseCsvAsync(fileStream)
                    : await ParseExcelAsync(fileStream);

                result.TotalRecords = records.Count;

                foreach (var (record, index) in records.Select((r, i) => (r, i)))
                {
                    var rowNumber = index + 2;
                    var validation = await ValidateCustomerAsync(record, rowNumber);

                    if (validation.IsValid)
                    {
                        var customer = await MapToCustomerAsync(record);
                        _context.Customers.Add(customer);
                        result.SuccessfulRecords.Add(customer);
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
                    _logger.LogInformation("Successfully imported {Count} customers", result.SuccessCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during customer import");
                result.Errors.Add(new ImportError
                {
                    RowNumber = 0,
                    FieldName = "General",
                    ErrorMessage = $"Import failed: {ex.Message}"
                });
            }

            return result;
        }

        public async Task<ImportResult<Customer>> ValidateImportAsync(Stream fileStream, FileFormat format)
        {
            var result = new ImportResult<Customer>();

            try
            {
                var records = format == FileFormat.CSV
                    ? await ParseCsvAsync(fileStream)
                    : await ParseExcelAsync(fileStream);

                result.TotalRecords = records.Count;

                foreach (var (record, index) in records.Select((r, i) => (r, i)))
                {
                    var rowNumber = index + 2;
                    var validation = await ValidateCustomerAsync(record, rowNumber);

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
                _logger.LogError(ex, "Error during customer validation");
            }

            return result;
        }

        public async Task<byte[]> ExportAsync(ExportOptions options, FileFormat format)
        {
            var query = _context.Customers
                .Include(c => c.BillingAddress)
                .Include(c => c.ShippingAddress)
                .Where(c => !c.IsDeleted)
                .AsQueryable();

            if (options.SelectedIds != null && options.SelectedIds.Any())
                query = query.Where(c => options.SelectedIds.Contains(c.Id));

            var customers = await query.ToListAsync();

            return format == FileFormat.CSV
                ? await ExportToCsvAsync(customers)
                : await ExportToExcelAsync(customers);
        }

        #region CSV Methods

        private async Task<List<CustomerImportDto>> ParseCsvAsync(Stream fileStream)
        {
            using var reader = new StreamReader(fileStream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            });

            var records = csv.GetRecords<CustomerImportDto>().ToList();
            return await Task.FromResult(records);
        }

        private async Task<byte[]> GenerateCsvTemplateAsync()
        {
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            csv.WriteField("Customer Name");
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

            csv.WriteField("John Doe");
            csv.WriteField("Jane Smith");
            csv.WriteField("john@example.com");
            csv.WriteField("+92-300-1234567");
            csv.WriteField("042-12345678");
            csv.WriteField("www.example.com");
            csv.WriteField("1234567-8");
            csv.WriteField("123 Main St");
            csv.WriteField("Lahore");
            csv.WriteField("Pakistan");
            csv.WriteField("123 Main St");
            csv.WriteField("Lahore");
            csv.WriteField("Pakistan");
            csv.WriteField("VIP Customer");
            csv.NextRecord();

            await writer.FlushAsync();
            return memoryStream.ToArray();
        }

        private async Task<byte[]> ExportToCsvAsync(List<Customer> customers)
        {
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            csv.WriteField("Customer Name");
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

            foreach (var customer in customers)
            {
                csv.WriteField(customer.CustomerName);
                csv.WriteField(customer.ContactPerson);
                csv.WriteField(customer.Email);
                csv.WriteField(customer.MobileNo);
                csv.WriteField(customer.PhoneNo);
                csv.WriteField(customer.Website);
                csv.WriteField(customer.TaxNumber);
                csv.WriteField(customer.BillingAddress?.Address);
                csv.WriteField(customer.BillingAddress?.CityName);
                csv.WriteField(customer.BillingAddress?.CountryName);
                csv.WriteField(customer.ShippingAddress?.Address);
                csv.WriteField(customer.ShippingAddress?.CityName);
                csv.WriteField(customer.ShippingAddress?.CountryName);
                csv.WriteField(customer.Description);
                csv.NextRecord();
            }

            await writer.FlushAsync();
            return memoryStream.ToArray();
        }

        #endregion

        #region Excel Methods

        private async Task<List<CustomerImportDto>> ParseExcelAsync(Stream fileStream)
        {
            var records = new List<CustomerImportDto>();

            using var package = new ExcelPackage(fileStream);
            var worksheet = package.Workbook.Worksheets.FirstOrDefault(w => w.Name == "Customers");

            if (worksheet == null)
                throw new Exception("Customers worksheet not found");

            var rowCount = worksheet.Dimension?.Rows ?? 0;

            for (int row = 2; row <= rowCount; row++)
            {
                if (string.IsNullOrWhiteSpace(worksheet.Cells[row, 1].Text))
                    continue;

                var record = new CustomerImportDto
                {
                    CustomerName = worksheet.Cells[row, 1].Text,
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
            instructionsSheet.Cells["A1"].Value = "Customer Import Template";
            instructionsSheet.Cells["A1"].Style.Font.Size = 16;
            instructionsSheet.Cells["A1"].Style.Font.Bold = true;

            instructionsSheet.Cells["A3"].Value = "Instructions:";
            instructionsSheet.Cells["A4"].Value = "1. Fill in the 'Customers' sheet with your data";
            instructionsSheet.Cells["A5"].Value = "2. Required fields are marked with * in header";
            instructionsSheet.Cells["A6"].Value = "3. Email must be valid format";
            instructionsSheet.Cells["A7"].Value = "4. Mobile No is required";

            var customersSheet = package.Workbook.Worksheets.Add("Customers");

            var headers = new[] { "Customer Name*", "Contact Person", "Email", "Mobile No*",
                                  "Phone No", "Website", "Tax Number", "Billing Address",
                                  "Billing City", "Billing Country", "Shipping Address",
                                  "Shipping City", "Shipping Country", "Description" };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = customersSheet.Cells[1, i + 1];
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGreen);
            }

            customersSheet.Cells["A2"].Value = "John Doe";
            customersSheet.Cells["B2"].Value = "Jane Smith";
            customersSheet.Cells["C2"].Value = "john@example.com";
            customersSheet.Cells["D2"].Value = "+92-300-1234567";
            customersSheet.Cells["E2"].Value = "042-12345678";
            customersSheet.Cells["F2"].Value = "www.example.com";
            customersSheet.Cells["G2"].Value = "1234567-8";
            customersSheet.Cells["H2"].Value = "123 Main St";
            customersSheet.Cells["I2"].Value = "Lahore";
            customersSheet.Cells["J2"].Value = "Pakistan";
            customersSheet.Cells["K2"].Value = "123 Main St";
            customersSheet.Cells["L2"].Value = "Lahore";
            customersSheet.Cells["M2"].Value = "Pakistan";
            customersSheet.Cells["N2"].Value = "VIP Customer";

            customersSheet.Cells.AutoFitColumns();

            return await Task.FromResult(package.GetAsByteArray());
        }

        private async Task<byte[]> ExportToExcelAsync(List<Customer> customers)
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Customers");

            var headers = new[] { "Customer Name", "Contact Person", "Email", "Mobile No",
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
            foreach (var customer in customers)
            {
                worksheet.Cells[row, 1].Value = customer.CustomerName;
                worksheet.Cells[row, 2].Value = customer.ContactPerson;
                worksheet.Cells[row, 3].Value = customer.Email;
                worksheet.Cells[row, 4].Value = customer.MobileNo;
                worksheet.Cells[row, 5].Value = customer.PhoneNo;
                worksheet.Cells[row, 6].Value = customer.Website;
                worksheet.Cells[row, 7].Value = customer.TaxNumber;
                worksheet.Cells[row, 8].Value = customer.BillingAddress?.Address;
                worksheet.Cells[row, 9].Value = customer.BillingAddress?.CityName;
                worksheet.Cells[row, 10].Value = customer.BillingAddress?.CountryName;
                worksheet.Cells[row, 11].Value = customer.ShippingAddress?.Address;
                worksheet.Cells[row, 12].Value = customer.ShippingAddress?.CityName;
                worksheet.Cells[row, 13].Value = customer.ShippingAddress?.CountryName;
                worksheet.Cells[row, 14].Value = customer.Description;
                row++;
            }

            worksheet.Cells.AutoFitColumns();

            return await Task.FromResult(package.GetAsByteArray());
        }

        #endregion

        #region Validation

        private async Task<(bool IsValid, List<ImportError> Errors)> ValidateCustomerAsync(CustomerImportDto dto, int rowNumber)
        {
            var errors = new List<ImportError>();

            if (string.IsNullOrWhiteSpace(dto.CustomerName))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Customer Name", ErrorMessage = "Customer Name is required" });

            if (string.IsNullOrWhiteSpace(dto.MobileNo))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Mobile No", ErrorMessage = "Mobile No is required" });

            if (!string.IsNullOrWhiteSpace(dto.Email) && !IsValidEmail(dto.Email))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Email", ErrorMessage = "Invalid email format" });

            // Duplicate check
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var exists = await _context.Customers.AnyAsync(c => c.Email == dto.Email && !c.IsDeleted);
                if (exists)
                    errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Email", ErrorMessage = $"Customer with email '{dto.Email}' already exists" });
            }

            return (errors.Count == 0, errors);
        }

        private async Task<Customer> MapToCustomerAsync(CustomerImportDto dto)
        {
            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                CustomerName = dto.CustomerName,
                ContactPerson = dto.ContactPerson,
                Email = dto.Email,
                MobileNo = dto.MobileNo,
                PhoneNo = dto.PhoneNo,
                Website = dto.Website,
                TaxNumber = dto.TaxNumber,
                Description = dto.Description,
                IsDeleted = false,
                IsWalkIn = false
            };

            // Create billing address if provided
            if (!string.IsNullOrWhiteSpace(dto.BillingAddress))
            {
                var billingAddress = new ContactAddress
                {
                    Id = Guid.NewGuid(),
                    Address = dto.BillingAddress,
                    CityName = dto.BillingCity,
                    CountryName = dto.BillingCountry,
                    IsDeleted = false
                };
                _context.ContactAddresses.Add(billingAddress);
                customer.BillingAddressId = billingAddress.Id;
            }

            // Create shipping address if provided
            if (!string.IsNullOrWhiteSpace(dto.ShippingAddress))
            {
                var shippingAddress = new ContactAddress
                {
                    Id = Guid.NewGuid(),
                    Address = dto.ShippingAddress,
                    CityName = dto.ShippingCity,
                    CountryName = dto.ShippingCountry,
                    IsDeleted = false
                };
                _context.ContactAddresses.Add(shippingAddress);
                customer.ShippingAddressId = shippingAddress.Id;
            }

            return await Task.FromResult(customer);
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
