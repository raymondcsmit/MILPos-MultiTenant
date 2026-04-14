# Daily Product Price Manager - Implementation Plan

## Overview

This feature enables users to manage daily product pricing with automatic fallback mechanisms:
- **Combined View Interface**: Grouped product list with detail panel (based on `daily-price-combined-view.html`)
- **Bulk Operations**: Import prices via CSV/Excel and Export current view
- **Price Resolution**: Today's price → Previous day's price → Product base price
- **History Tracking**: Complete audit log of all price changes

## Database Schema Changes

### New Entity: DailyProductPrice

```csharp
public class DailyProductPrice : BaseEntity
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    [ForeignKey("ProductId")]
    public Product Product { get; set; }
    
    public DateTime PriceDate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal SalesPrice { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Mrp { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    // Audit fields inherited from BaseEntity
    // TenantId, CreatedDate, CreatedBy, ModifiedDate, ModifiedBy, IsDeleted
}
```

### Database Configuration

Add to `POSDbContext.OnModelCreating`:

```csharp
modelBuilder.Entity<DailyProductPrice>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.HasIndex(e => new { e.ProductId, e.PriceDate, e.TenantId })
          .IsUnique()
          .HasDatabaseName("IX_DailyProductPrice_Product_Date_Tenant");
    
    entity.Property(e => e.SalesPrice).IsRequired();
    entity.Property(e => e.PriceDate).IsRequired();
    
    entity.HasOne(e => e.Product)
          .WithMany()
          .HasForeignKey(e => e.ProductId)
          .OnDelete(DeleteBehavior.Restrict);
});
```

---

## Data Layer Changes

### 1. DTOs

#### POS.Data/Dto/DailyProductPrice/DailyProductPriceDto.cs
```csharp
public class DailyProductPriceDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; }
    public string ProductCode { get; set; }
    public string CategoryName { get; set; }
    public string BrandName { get; set; }
    public DateTime PriceDate { get; set; }
    public decimal SalesPrice { get; set; }
    public decimal? Mrp { get; set; }
    public decimal? BaseSalesPrice { get; set; }
    public decimal? PreviousDayPrice { get; set; }
    public bool IsActive { get; set; }
    public string Status { get; set; } // "Updated", "Pending", "Unchanged"
}
```

#### POS.Data/Dto/DailyProductPrice/DailyPriceListDto.cs
```csharp
public class DailyPriceListDto
{
    public DateTime PriceDate { get; set; }
    public List<DailyProductPriceDto> Prices { get; set; }
    public DailyPriceSummaryDto Summary { get; set; }
}
```

---

## Repository Layer

### 2. New Repository

#### POS.Repository/DailyProductPrice/IDailyProductPriceRepository.cs
```csharp
public interface IDailyProductPriceRepository
{
    Task<DailyPriceListDto> GetDailyPriceList(DateTime priceDate);
    Task<DailyProductPrice> GetProductPriceForDate(Guid productId, DateTime priceDate);
    Task<decimal> GetEffectivePrice(Guid productId, DateTime priceDate);
    Task<bool> BulkUpsertDailyPrices(List<DailyProductPrice> prices);
    Task<List<DailyPriceHistoryDto>> GetPriceHistory(Guid productId, DateTime startDate, DateTime endDate);
}
```

---

## MediatR Layer (CQRS)

### 3. Commands

#### Manage Prices
- `UpdateDailyPriceListCommand`: Bulk update prices (used by UI for manual edits)
- `CopyPreviousDayPricesCommand`: Bulk copy from yesterday

#### Import/Export
- `ImportDailyPricesCommand`: Handles CSV/Excel file upload.
  - inputs: `IFormFile File`, `DateTime PriceDate`
  - logic: Parse file, validate products, call `BulkUpsertDailyPrices`
- `ExportDailyPricesCommand`: Generates CSV/Excel of current view.
  - inputs: `DateTime PriceDate`, `string Format` (csv/xlsx)
  - returns: `FileStreamResult`

### 4. Queries (Enhanced for Combined View)

#### `GetDailyPriceListQuery`
- Returns grouped data structure: `Dictionary<string, List<DailyProductPriceDto>>` (Key: Category/Brand)
- Populates `Status`, `PreviousDayPrice`, and `BaseSalesPrice` for UI indicators

#### `GetProductPriceDetailQuery`
- Returns detailed view for Right Panel:
  - Current Daily Price
  - 30-day Price History (for Chart)
  - Audit Log (Recent changes)
  - Variance Analysis vs Base Price

---

## API Layer

### 5. Controller: `DailyProductPriceController`

```csharp
[HttpGet("price-list/{date}")]
public async Task<IActionResult> GetDailyPriceList(DateTime date, [FromQuery] string groupBy = "Category")

[HttpGet("product/{productId}/detail")]
public async Task<IActionResult> GetProductDetail(Guid productId, [FromQuery] DateTime date)

[HttpPost("bulk-update")]
public async Task<IActionResult> UpdateDailyPriceList([FromBody] UpdateDailyPriceListCommand command)

[HttpPost("import")]
public async Task<IActionResult> ImportPrices([FromForm] ImportDailyPricesCommand command)

[HttpGet("export")]
public async Task<IActionResult> ExportPrices([FromQuery] ExportDailyPricesCommand command)
```

---

## UI Layer Implementation (Combined View)

### 6. Main View: `Views/DailyProductPrice/Index.cshtml`
- **Layout**: Two-column layout based on mockup `daily-price-combined-view.html`
- **Left Panel**: 
  - Date Picker & Search
  - Group By Toggle (Category / Brand)
  - Accordion list of products with quick-edit inputs
- **Right Panel**:
  - Sticky details panel updating on list selection

### 7. Scripts: `daily-price-manager.js`
- **State Management**:
  - `currentDate`: Selected date
  - `selectedProductId`: Currently focused product
  - `priceData`: Local cache of fetched prices
- **Functions**:
  - `loadPriceList(date)`: Fetches data and renders Left Panel
  - `renderProductList(data, groupBy)`: Groups data and builds HTML
  - `selectProduct(id)`: Fetches detail and updates Right Panel
  - `updateRightPanel(detail)`: Renders Chart.js and Stats
  - `saveChanges()`: Collects dirty items and calls API
  - `exportData(format)`: Triggers download
  - `importData(file)`: Uploads file and refreshes list

### 8. Import/Export Features
- **Export Button**: Dropdown for "Export to CSV" / "Export to Excel"
- **Import Button**: Opens modal to upload file
  - **Template**: Provide downloadable template for users

---

## Business Logic Updates

### Price Resolution (in `GetEffectivePrice`)
1. **Daily Override**: Check `DailyProductPrice` for specific date
2. **Fallback**: Check `DailyProductPrice` for Yesterday (recursive up to X days)
3. **Base**: Return `Product.SalesPrice`

---

## Migration Strategy

1. **Database**: Create `DailyProductPrices` table
2. **Backend**: Implement Entities, Repositories, Commands/Queries
3. **API**: Expose endpoints including Import/Export
4. **Frontend**: Implement Combined View logic and integrate with API

**Estimated Effort**: 6-8 developer days (increased for Import/Export & Complex UI)
