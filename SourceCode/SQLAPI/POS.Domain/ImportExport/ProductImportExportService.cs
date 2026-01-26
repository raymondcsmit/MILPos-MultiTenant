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
using POS.Domain.ImportExport.DTOs;

namespace POS.Domain.ImportExport
{
    public class ProductImportExportService : IImportExportService<Product>
    {
        private readonly POSDbContext _context;
        private readonly ILogger<ProductImportExportService> _logger;

        public ProductImportExportService(POSDbContext context, ILogger<ProductImportExportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<byte[]> GenerateTemplateAsync(FileFormat format)
        {
            return format == FileFormat.CSV 
                ? await GenerateCsvTemplateAsync() 
                : await GenerateExcelTemplateAsync();
        }

        public async Task<ImportResult<Product>> ImportAsync(Stream fileStream, FileFormat format)
        {
            var result = new ImportResult<Product>();

            try
            {
                // Parse file
                var records = format == FileFormat.CSV
                    ? await ParseCsvAsync(fileStream)
                    : await ParseExcelAsync(fileStream);

                result.TotalRecords = records.Count;

                // Validate and import
                foreach (var (record, index) in records.Select((r, i) => (r, i)))
                {
                    var rowNumber = index + 2; // +2 for header row
                    var validation = await ValidateProductAsync(record, rowNumber);

                    if (validation.IsValid)
                    {
                        var product = await MapToProductAsync(record);
                        _context.Products.Add(product);
                        result.SuccessfulRecords.Add(product);
                        result.SuccessCount++;
                    }
                    else
                    {
                        result.Errors.AddRange(validation.Errors);
                        result.FailureCount++;
                    }
                }

                // Save all or none (transaction)
                if (result.FailureCount == 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully imported {Count} products", result.SuccessCount);
                }
                else
                {
                    _logger.LogWarning("Import failed with {ErrorCount} errors", result.FailureCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during product import");
                result.Errors.Add(new ImportError
                {
                    RowNumber = 0,
                    FieldName = "General",
                    ErrorMessage = $"Import failed: {ex.Message}"
                });
                result.FailureCount = result.TotalRecords;
            }

            return result;
        }

        public async Task<ImportResult<Product>> ValidateImportAsync(Stream fileStream, FileFormat format)
        {
            // Same as ImportAsync but without saving
            var result = new ImportResult<Product>();

            try
            {
                var records = format == FileFormat.CSV
                    ? await ParseCsvAsync(fileStream)
                    : await ParseExcelAsync(fileStream);

                result.TotalRecords = records.Count;

                foreach (var (record, index) in records.Select((r, i) => (r, i)))
                {
                    var rowNumber = index + 2;
                    var validation = await ValidateProductAsync(record, rowNumber);

                    if (validation.IsValid)
                    {
                        result.SuccessCount++;
                    }
                    else
                    {
                        result.Errors.AddRange(validation.Errors);
                        result.FailureCount++;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during product validation");
                result.Errors.Add(new ImportError
                {
                    RowNumber = 0,
                    FieldName = "General",
                    ErrorMessage = $"Validation failed: {ex.Message}"
                });
            }

            return result;
        }

        public async Task<byte[]> ExportAsync(ExportOptions options, FileFormat format)
        {
            var query = _context.Products
                .Include(p => p.ProductCategory)
                .Include(p => p.Brand)
                .Include(p => p.Unit)
                .Where(p => !p.IsDeleted)
                .AsQueryable();

            // Apply filters
            if (options.SelectedIds != null && options.SelectedIds.Any())
            {
                query = query.Where(p => options.SelectedIds.Contains(p.Id));
            }

            var products = await query.ToListAsync();

            return format == FileFormat.CSV
                ? await ExportToCsvAsync(products)
                : await ExportToExcelAsync(products);
        }

        #region CSV Methods

        private async Task<List<ProductImportDto>> ParseCsvAsync(Stream fileStream)
        {
            using var reader = new StreamReader(fileStream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            });

            var records = csv.GetRecords<ProductImportDto>().ToList();
            return await Task.FromResult(records);
        }

        private async Task<byte[]> GenerateCsvTemplateAsync()
        {
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            // Write headers
            csv.WriteField("Code");
            csv.WriteField("Name");
            csv.WriteField("Barcode");
            csv.WriteField("SKU Code");
            csv.WriteField("SKU Name");
            csv.WriteField("Category");
            csv.WriteField("Brand");
            csv.WriteField("Unit");
            csv.WriteField("Purchase Price");
            csv.WriteField("Sales Price");
            csv.WriteField("MRP");
            csv.WriteField("Margin");
            csv.WriteField("Tax Amount");
            csv.WriteField("Alert Quantity");
            csv.WriteField("Description");
            csv.NextRecord();

            // Write sample row
            csv.WriteField("PROD001");
            csv.WriteField("Sample Product");
            csv.WriteField("123456789012");
            csv.WriteField("SKU-001");
            csv.WriteField("Sample SKU");
            csv.WriteField("Electronics");
            csv.WriteField("Samsung");
            csv.WriteField("Piece");
            csv.WriteField("5000.00");
            csv.WriteField("7500.00");
            csv.WriteField("8000.00");
            csv.WriteField("25.00");
            csv.WriteField("15.00");
            csv.WriteField("10");
            csv.WriteField("Sample product description");
            csv.NextRecord();

            await writer.FlushAsync();
            return memoryStream.ToArray();
        }

        private async Task<byte[]> ExportToCsvAsync(List<Product> products)
        {
            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            // Write headers
            csv.WriteField("Code");
            csv.WriteField("Name");
            csv.WriteField("Barcode");
            csv.WriteField("SKU Code");
            csv.WriteField("SKU Name");
            csv.WriteField("Category");
            csv.WriteField("Brand");
            csv.WriteField("Unit");
            csv.WriteField("Purchase Price");
            csv.WriteField("Sales Price");
            csv.WriteField("MRP");
            csv.WriteField("Margin");
            csv.WriteField("Tax Amount");
            csv.WriteField("Alert Quantity");
            csv.WriteField("Description");
            csv.NextRecord();

            // Write data
            foreach (var product in products)
            {
                csv.WriteField(product.Code);
                csv.WriteField(product.Name);
                csv.WriteField(product.Barcode);
                csv.WriteField(product.SkuCode);
                csv.WriteField(product.SkuName);
                csv.WriteField(product.ProductCategory?.Name);
                csv.WriteField(product.Brand?.Name);
                csv.WriteField(product.Unit?.Name);
                csv.WriteField(product.PurchasePrice);
                csv.WriteField(product.SalesPrice);
                csv.WriteField(product.Mrp);
                csv.WriteField(product.Margin);
                csv.WriteField(product.TaxAmount);
                csv.WriteField(product.AlertQuantity);
                csv.WriteField(product.Description);
                csv.NextRecord();
            }

            await writer.FlushAsync();
            return memoryStream.ToArray();
        }

        #endregion

        #region Excel Methods

        private async Task<List<ProductImportDto>> ParseExcelAsync(Stream fileStream)
        {
            var records = new List<ProductImportDto>();

            using var package = new ExcelPackage(fileStream);
            var worksheet = package.Workbook.Worksheets.FirstOrDefault(w => w.Name == "Products");

            if (worksheet == null)
                throw new Exception("Products worksheet not found");

            var rowCount = worksheet.Dimension?.Rows ?? 0;

            for (int row = 2; row <= rowCount; row++) // Start from row 2 (skip header)
            {
                // Skip empty rows
                if (string.IsNullOrWhiteSpace(worksheet.Cells[row, 1].Text))
                    continue;

                var record = new ProductImportDto
                {
                    Code = worksheet.Cells[row, 1].Text,
                    Name = worksheet.Cells[row, 2].Text,
                    Barcode = worksheet.Cells[row, 3].Text,
                    SkuCode = worksheet.Cells[row, 4].Text,
                    SkuName = worksheet.Cells[row, 5].Text,
                    Category = worksheet.Cells[row, 6].Text,
                    Brand = worksheet.Cells[row, 7].Text,
                    Unit = worksheet.Cells[row, 8].Text,
                    PurchasePrice = ParseDecimal(worksheet.Cells[row, 9].Text),
                    SalesPrice = ParseDecimal(worksheet.Cells[row, 10].Text),
                    Mrp = ParseDecimal(worksheet.Cells[row, 11].Text),
                    Margin = ParseDecimal(worksheet.Cells[row, 12].Text),
                    TaxAmount = ParseDecimal(worksheet.Cells[row, 13].Text),
                    AlertQuantity = ParseDecimal(worksheet.Cells[row, 14].Text),
                    Description = worksheet.Cells[row, 15].Text
                };

                records.Add(record);
            }

            return await Task.FromResult(records);
        }

        private async Task<byte[]> GenerateExcelTemplateAsync()
        {
            using var package = new ExcelPackage();

            // Instructions Sheet
            var instructionsSheet = package.Workbook.Worksheets.Add("Instructions");
            instructionsSheet.Cells["A1"].Value = "Product Import Template";
            instructionsSheet.Cells["A1"].Style.Font.Size = 16;
            instructionsSheet.Cells["A1"].Style.Font.Bold = true;

            instructionsSheet.Cells["A3"].Value = "Instructions:";
            instructionsSheet.Cells["A4"].Value = "1. Fill in the 'Products' sheet with your data";
            instructionsSheet.Cells["A5"].Value = "2. Required fields are marked with * in header";
            instructionsSheet.Cells["A6"].Value = "3. Category, Brand, and Unit must exist in system";
            instructionsSheet.Cells["A7"].Value = "4. Use 'Reference Data' sheet for valid values";
            instructionsSheet.Cells["A8"].Value = "5. Do not modify the header row";

            // Products Sheet
            var productsSheet = package.Workbook.Worksheets.Add("Products");

            // Headers
            var headers = new[] { "Code*", "Name*", "Barcode", "SKU Code", "SKU Name",
                                  "Category*", "Brand*", "Unit*", "Purchase Price", "Sales Price*",
                                  "MRP", "Margin", "Tax Amount", "Alert Quantity", "Description" };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = productsSheet.Cells[1, i + 1];
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightBlue);
            }

            // Sample data
            productsSheet.Cells["A2"].Value = "PROD001";
            productsSheet.Cells["B2"].Value = "Sample Product";
            productsSheet.Cells["C2"].Value = "123456789012";
            productsSheet.Cells["D2"].Value = "SKU-001";
            productsSheet.Cells["E2"].Value = "Sample SKU";
            productsSheet.Cells["F2"].Value = "Electronics";
            productsSheet.Cells["G2"].Value = "Samsung";
            productsSheet.Cells["H2"].Value = "Piece";
            productsSheet.Cells["I2"].Value = 5000.00;
            productsSheet.Cells["J2"].Value = 7500.00;
            productsSheet.Cells["K2"].Value = 8000.00;
            productsSheet.Cells["L2"].Value = 25.00;
            productsSheet.Cells["M2"].Value = 15.00;
            productsSheet.Cells["N2"].Value = 10;
            productsSheet.Cells["O2"].Value = "Sample description";

            // Reference Data Sheet
            var refSheet = package.Workbook.Worksheets.Add("Reference Data");
            refSheet.Cells["A1"].Value = "Categories";
            refSheet.Cells["B1"].Value = "Brands";
            refSheet.Cells["C1"].Value = "Units";
            refSheet.Cells["A1:C1"].Style.Font.Bold = true;

            // Load from database
            var categories = await _context.ProductCategories.Where(c => !c.IsDeleted).Select(c => c.Name).ToListAsync();
            var brands = await _context.Brands.Where(b => !b.IsDeleted).Select(b => b.Name).ToListAsync();
            var units = await _context.UnitConversations.Select(u => u.Name).ToListAsync();

            for (int i = 0; i < categories.Count; i++)
                refSheet.Cells[i + 2, 1].Value = categories[i];
            for (int i = 0; i < brands.Count; i++)
                refSheet.Cells[i + 2, 2].Value = brands[i];
            for (int i = 0; i < units.Count; i++)
                refSheet.Cells[i + 2, 3].Value = units[i];

            // Add data validation for dropdowns
            if (categories.Any())
            {
                var categoryValidation = productsSheet.DataValidations.AddListValidation("F2:F10000");
                categoryValidation.Formula.ExcelFormula = $"'Reference Data'!$A$2:$A${categories.Count + 1}";
            }

            if (brands.Any())
            {
                var brandValidation = productsSheet.DataValidations.AddListValidation("G2:G10000");
                brandValidation.Formula.ExcelFormula = $"'Reference Data'!$B$2:$B${brands.Count + 1}";
            }

            if (units.Any())
            {
                var unitValidation = productsSheet.DataValidations.AddListValidation("H2:H10000");
                unitValidation.Formula.ExcelFormula = $"'Reference Data'!$C$2:$C${units.Count + 1}";
            }

            // Auto-fit columns
            productsSheet.Cells.AutoFitColumns();
            refSheet.Cells.AutoFitColumns();

            return package.GetAsByteArray();
        }

        private async Task<byte[]> ExportToExcelAsync(List<Product> products)
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Products");

            // Headers
            var headers = new[] { "Code", "Name", "Barcode", "SKU Code", "SKU Name",
                                  "Category", "Brand", "Unit", "Purchase Price", "Sales Price",
                                  "MRP", "Margin", "Tax Amount", "Alert Quantity", "Description" };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cells[1, i + 1];
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }

            // Data
            int row = 2;
            foreach (var product in products)
            {
                worksheet.Cells[row, 1].Value = product.Code;
                worksheet.Cells[row, 2].Value = product.Name;
                worksheet.Cells[row, 3].Value = product.Barcode;
                worksheet.Cells[row, 4].Value = product.SkuCode;
                worksheet.Cells[row, 5].Value = product.SkuName;
                worksheet.Cells[row, 6].Value = product.ProductCategory?.Name;
                worksheet.Cells[row, 7].Value = product.Brand?.Name;
                worksheet.Cells[row, 8].Value = product.Unit?.Name;
                worksheet.Cells[row, 9].Value = product.PurchasePrice;
                worksheet.Cells[row, 10].Value = product.SalesPrice;
                worksheet.Cells[row, 11].Value = product.Mrp;
                worksheet.Cells[row, 12].Value = product.Margin;
                worksheet.Cells[row, 13].Value = product.TaxAmount;
                worksheet.Cells[row, 14].Value = product.AlertQuantity;
                worksheet.Cells[row, 15].Value = product.Description;
                row++;
            }

            worksheet.Cells.AutoFitColumns();

            return await Task.FromResult(package.GetAsByteArray());
        }

        #endregion

        #region Validation

        private async Task<(bool IsValid, List<ImportError> Errors)> ValidateProductAsync(ProductImportDto dto, int rowNumber)
        {
            var errors = new List<ImportError>();

            // Required fields
            if (string.IsNullOrWhiteSpace(dto.Code))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Code", ErrorMessage = "Code is required" });

            if (string.IsNullOrWhiteSpace(dto.Name))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Name", ErrorMessage = "Name is required" });

            if (string.IsNullOrWhiteSpace(dto.Category))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Category", ErrorMessage = "Category is required" });

            if (string.IsNullOrWhiteSpace(dto.Brand))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Brand", ErrorMessage = "Brand is required" });

            if (string.IsNullOrWhiteSpace(dto.Unit))
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Unit", ErrorMessage = "Unit is required" });

            if (!dto.SalesPrice.HasValue || dto.SalesPrice <= 0)
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Sales Price", ErrorMessage = "Sales Price must be greater than 0" });

            // Duplicate check
            if (!string.IsNullOrWhiteSpace(dto.Code))
            {
                var exists = await _context.Products.AnyAsync(p => p.Code == dto.Code && !p.IsDeleted);
                if (exists)
                    errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Code", ErrorMessage = $"Product with code '{dto.Code}' already exists" });
            }

            // Foreign key validation
            if (!string.IsNullOrWhiteSpace(dto.Category))
            {
                var categoryExists = await _context.ProductCategories.AnyAsync(c => c.Name == dto.Category && !c.IsDeleted);
                if (!categoryExists)
                    errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Category", ErrorMessage = $"Category '{dto.Category}' not found" });
            }

            if (!string.IsNullOrWhiteSpace(dto.Brand))
            {
                var brandExists = await _context.Brands.AnyAsync(b => b.Name == dto.Brand && !b.IsDeleted);
                if (!brandExists)
                    errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Brand", ErrorMessage = $"Brand '{dto.Brand}' not found" });
            }

            if (!string.IsNullOrWhiteSpace(dto.Unit))
            {
                var unitExists = await _context.UnitConversations.AnyAsync(u => u.Name == dto.Unit);
                if (!unitExists)
                    errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Unit", ErrorMessage = $"Unit '{dto.Unit}' not found" });
            }

            // Price validation
            if (dto.PurchasePrice.HasValue && dto.SalesPrice.HasValue && dto.SalesPrice < dto.PurchasePrice)
                errors.Add(new ImportError { RowNumber = rowNumber, FieldName = "Sales Price", ErrorMessage = "Sales Price must be greater than or equal to Purchase Price" });

            return (errors.Count == 0, errors);
        }

        private async Task<Product> MapToProductAsync(ProductImportDto dto)
        {
            var category = await _context.ProductCategories.FirstAsync(c => c.Name == dto.Category && !c.IsDeleted);
            var brand = await _context.Brands.FirstAsync(b => b.Name == dto.Brand && !b.IsDeleted);
            var unit = await _context.UnitConversations.FirstAsync(u => u.Name == dto.Unit);

            return new Product
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                Name = dto.Name,
                Barcode = dto.Barcode,
                SkuCode = dto.SkuCode,
                SkuName = dto.SkuName,
                CategoryId = category.Id,
                BrandId = brand.Id,
                UnitId = unit.Id,
                PurchasePrice = dto.PurchasePrice,
                SalesPrice = dto.SalesPrice ?? 0,
                Mrp = dto.Mrp,
                Margin = dto.Margin ?? 0,
                TaxAmount = dto.TaxAmount,
                AlertQuantity = dto.AlertQuantity,
                Description = dto.Description,
                IsDeleted = false,
                HasVariant = false
            };
        }

        private decimal? ParseDecimal(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            if (decimal.TryParse(value, out var result))
                return result;

            return null;
        }

        #endregion
    }
}
