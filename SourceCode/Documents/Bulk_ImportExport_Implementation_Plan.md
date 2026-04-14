# Bulk Import/Export Implementation Plan
## CSV & Excel Import/Export for Products, Customers, and Suppliers

---

## Executive Summary

This plan outlines the implementation of bulk import/export functionality to allow users to:
- **Import** Products, Customers, and Suppliers from CSV and Excel files
- **Export** existing data to CSV and Excel formats
- **Download** pre-formatted templates for easy data entry

**Supported Formats:**
- CSV (.csv)
- Excel (.xlsx)

**Supported Entities:**
- Products (with Categories, Brands, Units)
- Customers (with Addresses)
- Suppliers (with Addresses)

---

## User Review Required

> [!IMPORTANT]
> **Template Files Required**
> - Users need downloadable templates to fill in data
> - Templates must include:
>   - Column headers with descriptions
>   - Sample data rows
>   - Data validation (for Excel)
>   - Instructions sheet (for Excel)

> [!WARNING]
> **Data Validation Considerations**
> - Duplicate detection strategy (by Code, Email, etc.)
> - Foreign key validation (Categories, Brands must exist)
> - Required vs optional fields
> - Data format validation (emails, phone numbers)

> [!CAUTION]
> **Large File Handling**
> - Files with 10,000+ records need batch processing
> - Progress tracking required
> - Memory management for large exports

---

## Proposed Changes

### Component 1: NuGet Packages

#### New Dependencies

```xml
<!-- POS.Domain.csproj -->
<PackageReference Include="EPPlus" Version="7.0.0" />
<PackageReference Include="CsvHelper" Version="30.0.1" />
```

**EPPlus**: Excel file generation and parsing (.xlsx)
**CsvHelper**: CSV file parsing and generation

---

### Component 2: Import/Export Service Layer

#### [NEW] [IImportExportService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/ImportExport/IImportExportService.cs)

Generic interface for import/export operations.

```csharp
public interface IImportExportService<T> where T : class
{
    // Template Generation
    Task<byte[]> GenerateTemplateAsync(FileFormat format);
    
    // Import
    Task<ImportResult<T>> ImportAsync(Stream fileStream, FileFormat format);
    Task<ImportResult<T>> ValidateImportAsync(Stream fileStream, FileFormat format);
    
    // Export
    Task<byte[]> ExportAsync(ExportOptions options, FileFormat format);
}

public enum FileFormat
{
    CSV,
    Excel
}

public class ImportResult<T>
{
    public int TotalRecords { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<T> SuccessfulRecords { get; set; }
    public List<ImportError> Errors { get; set; }
    public bool IsSuccess => FailureCount == 0;
}

public class ImportError
{
    public int RowNumber { get; set; }
    public string FieldName { get; set; }
    public string ErrorMessage { get; set; }
    public string RowData { get; set; }
}

public class ExportOptions
{
    public List<Guid> SelectedIds { get; set; }
    public Dictionary<string, string> Filters { get; set; }
    public bool ExportAll { get; set; }
    public List<string> ColumnsToExport { get; set; }
}
```

---

### Component 3: Product Import/Export

#### [NEW] [ProductImportExportService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/ImportExport/ProductImportExportService.cs)

**Product CSV/Excel Format:**

| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| Code | Yes | String | Unique product code | PROD001 |
| Name | Yes | String | Product name | Laptop Dell XPS 15 |
| Barcode | No | String | Product barcode | 123456789012 |
| SKU Code | No | String | SKU identifier | SKU-LAPTOP-001 |
| Category | Yes | String | Category name | Electronics |
| Brand | Yes | String | Brand name | Dell |
| Unit | Yes | String | Unit of measure | Piece |
| Purchase Price | No | Decimal | Cost price | 50000.00 |
| Sales Price | Yes | Decimal | Selling price | 75000.00 |
| MRP | No | Decimal | Maximum retail price | 80000.00 |
| Margin | No | Decimal | Profit margin % | 25.00 |
| Tax Amount | No | Decimal | Tax percentage | 15.00 |
| Alert Quantity | No | Decimal | Low stock alert | 10 |
| Description | No | String | Product description | High-performance laptop |

**Validation Rules:**
- ✅ Code must be unique
- ✅ Category must exist in database
- ✅ Brand must exist in database
- ✅ Unit must exist in database
- ✅ Sales Price must be > 0
- ✅ If Purchase Price provided, Sales Price must be >= Purchase Price

**Implementation:**

```csharp
public class ProductImportExportService : IImportExportService<Product>
{
    private readonly POSDbContext _context;
    private readonly ILogger<ProductImportExportService> _logger;
    
    public async Task<ImportResult<Product>> ImportAsync(Stream fileStream, FileFormat format)
    {
        var result = new ImportResult<Product>();
        
        // Parse file
        var records = format == FileFormat.CSV 
            ? await ParseCsvAsync(fileStream)
            : await ParseExcelAsync(fileStream);
        
        result.TotalRecords = records.Count;
        
        // Validate and import
        foreach (var (record, index) in records.Select((r, i) => (r, i)))
        {
            var validation = await ValidateProductAsync(record, index + 2); // +2 for header row
            
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
        
        // Save all or none
        if (result.FailureCount == 0)
        {
            await _context.SaveChangesAsync();
        }
        
        return result;
    }
    
    private async Task<Product> MapToProductAsync(ProductImportDto dto)
    {
        // Lookup foreign keys
        var category = await _context.ProductCategories
            .FirstOrDefaultAsync(c => c.Name == dto.Category);
        var brand = await _context.Brands
            .FirstOrDefaultAsync(b => b.Name == dto.Brand);
        var unit = await _context.UnitConversations
            .FirstOrDefaultAsync(u => u.Name == dto.Unit);
        
        return new Product
        {
            Id = Guid.NewGuid(),
            Code = dto.Code,
            Name = dto.Name,
            Barcode = dto.Barcode,
            SkuCode = dto.SkuCode,
            CategoryId = category.Id,
            BrandId = brand.Id,
            UnitId = unit.Id,
            PurchasePrice = dto.PurchasePrice,
            SalesPrice = dto.SalesPrice,
            Mrp = dto.Mrp,
            Margin = dto.Margin ?? 0,
            TaxAmount = dto.TaxAmount,
            AlertQuantity = dto.AlertQuantity,
            Description = dto.Description,
            CreatedDate = DateTime.UtcNow,
            IsDeleted = false
        };
    }
}
```

---

### Component 4: Customer Import/Export

#### [NEW] [CustomerImportExportService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/ImportExport/CustomerImportExportService.cs)

**Customer CSV/Excel Format:**

| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| Customer Name | Yes | String | Full name | John Doe |
| Contact Person | No | String | Contact person name | Jane Smith |
| Email | No | String | Email address | john@example.com |
| Mobile No | Yes | String | Mobile number | +92-300-1234567 |
| Phone No | No | String | Landline number | 042-12345678 |
| Website | No | String | Website URL | www.example.com |
| Tax Number | No | String | Tax registration | 1234567-8 |
| Billing Address | No | String | Full address | 123 Main St, Lahore |
| Billing City | No | String | City | Lahore |
| Billing Country | No | String | Country | Pakistan |
| Shipping Address | No | String | Full address | Same as billing |
| Shipping City | No | String | City | Lahore |
| Shipping Country | No | String | Country | Pakistan |
| Description | No | String | Notes | VIP Customer |

**Validation Rules:**
- ✅ Customer Name is required
- ✅ Mobile No is required
- ✅ Email must be valid format (if provided)
- ✅ Duplicate check by Email or Mobile No

---

### Component 5: Supplier Import/Export

#### [NEW] [SupplierImportExportService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/ImportExport/SupplierImportExportService.cs)

**Supplier CSV/Excel Format:**

| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| Supplier Name | Yes | String | Company name | ABC Suppliers Ltd |
| Contact Person | No | String | Contact person | Ahmed Ali |
| Email | No | String | Email address | info@abc.com |
| Mobile No | Yes | String | Mobile number | +92-321-9876543 |
| Phone No | No | String | Landline | 042-98765432 |
| Website | No | String | Website | www.abc.com |
| Tax Number | No | String | Tax registration | 9876543-2 |
| Billing Address | Yes | String | Full address | 456 Industrial Area |
| Billing City | Yes | String | City | Karachi |
| Billing Country | Yes | String | Country | Pakistan |
| Shipping Address | No | String | Full address | Same as billing |
| Shipping City | No | String | City | Karachi |
| Shipping Country | No | String | Country | Pakistan |

---

### Component 6: Template Generation

#### [NEW] [TemplateGeneratorService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/ImportExport/TemplateGeneratorService.cs)

**CSV Template Generation:**
```csharp
public async Task<byte[]> GenerateProductCsvTemplateAsync()
{
    using var memoryStream = new MemoryStream();
    using var writer = new StreamWriter(memoryStream);
    using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
    
    // Write headers
    csv.WriteField("Code");
    csv.WriteField("Name");
    csv.WriteField("Barcode");
    csv.WriteField("Category");
    csv.WriteField("Brand");
    csv.WriteField("Unit");
    csv.WriteField("Purchase Price");
    csv.WriteField("Sales Price");
    csv.WriteField("MRP");
    csv.WriteField("Description");
    csv.NextRecord();
    
    // Write sample row
    csv.WriteField("PROD001");
    csv.WriteField("Sample Product");
    csv.WriteField("123456789012");
    csv.WriteField("Electronics");
    csv.WriteField("Samsung");
    csv.WriteField("Piece");
    csv.WriteField("5000.00");
    csv.WriteField("7500.00");
    csv.WriteField("8000.00");
    csv.WriteField("Sample product description");
    csv.NextRecord();
    
    await writer.FlushAsync();
    return memoryStream.ToArray();
}
```

**Excel Template Generation:**
```csharp
public async Task<byte[]> GenerateProductExcelTemplateAsync()
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
    
    // Products Sheet
    var productsSheet = package.Workbook.Worksheets.Add("Products");
    
    // Headers with formatting
    var headers = new[] { "Code*", "Name*", "Barcode", "Category*", "Brand*", 
                          "Unit*", "Purchase Price", "Sales Price*", "MRP", "Description" };
    for (int i = 0; i < headers.Length; i++)
    {
        var cell = productsSheet.Cells[1, i + 1];
        cell.Value = headers[i];
        cell.Style.Font.Bold = true;
        cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
        cell.Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
    }
    
    // Sample data
    productsSheet.Cells["A2"].Value = "PROD001";
    productsSheet.Cells["B2"].Value = "Sample Product";
    productsSheet.Cells["C2"].Value = "123456789012";
    productsSheet.Cells["D2"].Value = "Electronics";
    productsSheet.Cells["E2"].Value = "Samsung";
    productsSheet.Cells["F2"].Value = "Piece";
    productsSheet.Cells["G2"].Value = 5000.00;
    productsSheet.Cells["H2"].Value = 7500.00;
    productsSheet.Cells["I2"].Value = 8000.00;
    productsSheet.Cells["J2"].Value = "Sample description";
    
    // Reference Data Sheet
    var refSheet = package.Workbook.Worksheets.Add("Reference Data");
    refSheet.Cells["A1"].Value = "Categories";
    refSheet.Cells["B1"].Value = "Brands";
    refSheet.Cells["C1"].Value = "Units";
    
    // Load from database
    var categories = await _context.ProductCategories.Select(c => c.Name).ToListAsync();
    var brands = await _context.Brands.Select(b => b.Name).ToListAsync();
    var units = await _context.UnitConversations.Select(u => u.Name).ToListAsync();
    
    for (int i = 0; i < categories.Count; i++)
        refSheet.Cells[i + 2, 1].Value = categories[i];
    for (int i = 0; i < brands.Count; i++)
        refSheet.Cells[i + 2, 2].Value = brands[i];
    for (int i = 0; i < units.Count; i++)
        refSheet.Cells[i + 2, 3].Value = units[i];
    
    // Add data validation for Category column
    var categoryValidation = productsSheet.DataValidations.AddListValidation("D2:D10000");
    categoryValidation.Formula.ExcelFormula = $"'Reference Data'!$A$2:$A${categories.Count + 1}";
    
    // Auto-fit columns
    productsSheet.Cells.AutoFitColumns();
    
    return package.GetAsByteArray();
}
```

---

### Component 7: API Controllers

#### [NEW] [ImportExportController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/ImportExportController.cs)

```csharp
[ApiController]
[Route("api/[controller]")]
public class ImportExportController : ControllerBase
{
    private readonly IImportExportService<Product> _productService;
    private readonly IImportExportService<Customer> _customerService;
    private readonly IImportExportService<Supplier> _supplierService;
    
    // Product Endpoints
    [HttpPost("products/import")]
    public async Task<IActionResult> ImportProducts(IFormFile file)
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
    
    [HttpGet("products/export")]
    public async Task<IActionResult> ExportProducts([FromQuery] string format = "csv")
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
    
    [HttpGet("products/template")]
    public async Task<IActionResult> GetProductTemplate([FromQuery] string format = "csv")
    {
        var fileFormat = format.ToLower() == "excel" ? FileFormat.Excel : FileFormat.CSV;
        var fileBytes = await _productService.GenerateTemplateAsync(fileFormat);
        var fileName = $"Product_Template.{(fileFormat == FileFormat.CSV ? "csv" : "xlsx")}";
        var contentType = fileFormat == FileFormat.CSV 
            ? "text/csv" 
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        return File(fileBytes, contentType, fileName);
    }
    
    // Similar endpoints for Customers and Suppliers
    // ...
}
```

---

### Component 8: Frontend UI

#### [MODIFY] Product List Page

Add Import/Export buttons to the toolbar.

**Location:** `src/app/product/product-list/product-list.component.html`

```html
<div class="toolbar">
  <button mat-raised-button color="primary" (click)="openAddProduct()">
    <mat-icon>add</mat-icon> Add Product
  </button>
  
  <!-- NEW: Import/Export Buttons -->
  <button mat-raised-button (click)="openImportDialog()">
    <mat-icon>upload</mat-icon> Import
  </button>
  
  <button mat-raised-button (click)="exportProducts('csv')">
    <mat-icon>download</mat-icon> Export CSV
  </button>
  
  <button mat-raised-button (click)="exportProducts('excel')">
    <mat-icon>download</mat-icon> Export Excel
  </button>
</div>
```

#### [NEW] Import Dialog Component

**Location:** `src/app/shared/components/import-dialog/import-dialog.component.ts`

```typescript
@Component({
  selector: 'app-import-dialog',
  template: `
    <h2 mat-dialog-title>Import {{ entityName }}</h2>
    
    <mat-dialog-content>
      <!-- Template Download -->
      <div class="template-section">
        <h3>Step 1: Download Template</h3>
        <button mat-stroked-button (click)="downloadTemplate('csv')">
          <mat-icon>description</mat-icon> Download CSV Template
        </button>
        <button mat-stroked-button (click)="downloadTemplate('excel')">
          <mat-icon>table_chart</mat-icon> Download Excel Template
        </button>
      </div>
      
      <!-- File Upload -->
      <div class="upload-section">
        <h3>Step 2: Upload Filled Template</h3>
        <input type="file" 
               #fileInput 
               accept=".csv,.xlsx" 
               (change)="onFileSelected($event)"
               style="display: none">
        
        <div class="dropzone" 
             (click)="fileInput.click()"
             (dragover)="onDragOver($event)"
             (drop)="onDrop($event)">
          <mat-icon>cloud_upload</mat-icon>
          <p>Click or drag file here</p>
          <p class="file-name" *ngIf="selectedFile">{{ selectedFile.name }}</p>
        </div>
      </div>
      
      <!-- Progress -->
      <div *ngIf="importing" class="progress-section">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>Importing {{ importProgress.current }} of {{ importProgress.total }} records...</p>
      </div>
      
      <!-- Results -->
      <div *ngIf="importResult" class="results-section">
        <div class="success" *ngIf="importResult.isSuccess">
          <mat-icon>check_circle</mat-icon>
          <p>Successfully imported {{ importResult.successCount }} records!</p>
        </div>
        
        <div class="errors" *ngIf="importResult.failureCount > 0">
          <mat-icon>error</mat-icon>
          <p>{{ importResult.failureCount }} records failed</p>
          
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>View Errors</mat-panel-title>
            </mat-expansion-panel-header>
            
            <table mat-table [dataSource]="importResult.errors">
              <ng-container matColumnDef="row">
                <th mat-header-cell *matHeaderCellDef>Row</th>
                <td mat-cell *matCellDef="let error">{{ error.rowNumber }}</td>
              </ng-container>
              
              <ng-container matColumnDef="field">
                <th mat-header-cell *matHeaderCellDef>Field</th>
                <td mat-cell *matCellDef="let error">{{ error.fieldName }}</td>
              </ng-container>
              
              <ng-container matColumnDef="message">
                <th mat-header-cell *matHeaderCellDef>Error</th>
                <td mat-cell *matCellDef="let error">{{ error.errorMessage }}</td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="['row', 'field', 'message']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['row', 'field', 'message']"></tr>
            </table>
          </mat-expansion-panel>
        </div>
      </div>
    </mat-dialog-content>
    
    <mat-dialog-actions>
      <button mat-button (click)="close()">Cancel</button>
      <button mat-raised-button 
              color="primary" 
              [disabled]="!selectedFile || importing"
              (click)="import()">
        Import
      </button>
    </mat-dialog-actions>
  `
})
export class ImportDialogComponent {
  @Input() entityName: string;
  @Input() apiEndpoint: string;
  
  selectedFile: File;
  importing = false;
  importProgress = { current: 0, total: 0 };
  importResult: any;
  
  async import() {
    this.importing = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    
    try {
      this.importResult = await this.http.post(this.apiEndpoint, formData).toPromise();
      if (this.importResult.success) {
        this.snackBar.open('Import completed successfully!', 'Close', { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open('Import failed!', 'Close', { duration: 3000 });
    } finally {
      this.importing = false;
    }
  }
  
  downloadTemplate(format: string) {
    const url = `${this.apiEndpoint}/template?format=${format}`;
    window.open(url, '_blank');
  }
}
```

---

## Affected Areas & Change Impact Analysis

### 1. **Backend Services** (NEW)

**Files to Create:**
- `POS.Domain/ImportExport/IImportExportService.cs`
- `POS.Domain/ImportExport/ProductImportExportService.cs`
- `POS.Domain/ImportExport/CustomerImportExportService.cs`
- `POS.Domain/ImportExport/SupplierImportExportService.cs`
- `POS.Domain/ImportExport/TemplateGeneratorService.cs`
- `POS.Domain/ImportExport/DTOs/ProductImportDto.cs`
- `POS.Domain/ImportExport/DTOs/CustomerImportDto.cs`
- `POS.Domain/ImportExport/DTOs/SupplierImportDto.cs`

**Impact:** ✅ No breaking changes - New services only

---

### 2. **API Controllers** (NEW)

**Files to Create:**
- `POS.API/Controllers/ImportExportController.cs`

**Impact:** ✅ No breaking changes - New endpoints only

---

### 3. **Frontend Components** (NEW + MODIFY)

**Files to Create:**
- `src/app/shared/components/import-dialog/import-dialog.component.ts`
- `src/app/shared/components/import-dialog/import-dialog.component.html`
- `src/app/shared/components/import-dialog/import-dialog.component.scss`

**Files to Modify:**
- `src/app/product/product-list/product-list.component.html` - Add buttons
- `src/app/product/product-list/product-list.component.ts` - Add methods
- `src/app/customer/customer-list/customer-list.component.html` - Add buttons
- `src/app/customer/customer-list/customer-list.component.ts` - Add methods
- `src/app/supplier/supplier-list/supplier-list.component.html` - Add buttons
- `src/app/supplier/supplier-list/supplier-list.component.ts` - Add methods

**Impact:** ⚠️ Minor UI changes - New buttons added to existing pages

---

### 4. **Database** (NO CHANGES)

**Impact:** ✅ No database schema changes required

---

### 5. **Dependencies** (NEW)

**Packages to Install:**
- EPPlus (7.0.0)
- CsvHelper (30.0.1)

**Impact:** ✅ No conflicts - Standard libraries

---

### 6. **Existing Functionality** (NO IMPACT)

**Impact:** ✅ No changes to existing CRUD operations

---

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Setup** | 1 day | Install packages, create folder structure |
| **Phase 2: Services** | 3 days | Implement import/export services for all entities |
| **Phase 3: Templates** | 2 days | Create CSV and Excel template generators |
| **Phase 4: API** | 1 day | Create controller endpoints |
| **Phase 5: Frontend** | 3 days | Create import dialog, add buttons, wire up |
| **Phase 6: Testing** | 2 days | Test all scenarios, fix bugs |
| **Phase 7: Documentation** | 1 day | User guide, API docs |

**Total: 13 days (2.5 weeks)**

---

## Verification Plan

### Automated Tests

1. **Unit Tests**
   - CSV parsing
   - Excel parsing
   - Validation logic
   - Template generation

2. **Integration Tests**
   - Import with valid data
   - Import with invalid data
   - Export functionality
   - Template download

### Manual Testing

1. **Import Testing**
   - ✅ Import 10 products from CSV
   - ✅ Import 10 products from Excel
   - ✅ Import with missing required fields (should fail)
   - ✅ Import with invalid category (should fail)
   - ✅ Import with duplicate codes (should fail)
   - ✅ Import 1000+ products (performance test)

2. **Export Testing**
   - ✅ Export all products to CSV
   - ✅ Export all products to Excel
   - ✅ Export filtered products
   - ✅ Export selected products

3. **Template Testing**
   - ✅ Download CSV template
   - ✅ Download Excel template
   - ✅ Verify Excel dropdowns work
   - ✅ Fill template and import

---

## Success Criteria

✅ **Functional:**
- Users can download templates in CSV and Excel
- Users can import data with validation
- Users can export data in both formats
- Error messages are clear and actionable

✅ **Performance:**
- Import 1000 records in < 30 seconds
- Export 10,000 records in < 1 minute
- Template generation in < 5 seconds

✅ **Usability:**
- Intuitive UI with clear instructions
- Drag-and-drop file upload
- Progress indicator for large files
- Detailed error reporting

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large file memory issues | Implement streaming and batch processing |
| Invalid foreign keys | Pre-validate against database |
| Duplicate data | Implement duplicate detection |
| Excel format compatibility | Use EPPlus library (industry standard) |
| User errors | Provide clear templates with examples |

---

## Sample Templates

### Product CSV Template
```csv
Code,Name,Barcode,Category,Brand,Unit,Purchase Price,Sales Price,MRP,Description
PROD001,Sample Product,123456789012,Electronics,Samsung,Piece,5000.00,7500.00,8000.00,Sample description
PROD002,Another Product,987654321098,Furniture,IKEA,Piece,10000.00,15000.00,16000.00,Another sample
```

### Customer CSV Template
```csv
Customer Name,Contact Person,Email,Mobile No,Phone No,Tax Number,Billing Address,Billing City,Billing Country
John Doe,Jane Smith,john@example.com,+92-300-1234567,042-12345678,1234567-8,123 Main St,Lahore,Pakistan
ABC Company,Ahmed Ali,info@abc.com,+92-321-9876543,042-98765432,9876543-2,456 Industrial Area,Karachi,Pakistan
```

### Supplier CSV Template
```csv
Supplier Name,Contact Person,Email,Mobile No,Phone No,Tax Number,Billing Address,Billing City,Billing Country
XYZ Suppliers,Ali Khan,ali@xyz.com,+92-333-1112233,042-11223344,1112233-4,789 Supply St,Islamabad,Pakistan
```
