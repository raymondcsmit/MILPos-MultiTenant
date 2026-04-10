# Bulk Import/Export - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the bulk import/export functionality for Products, Customers, and Suppliers.

---

## Prerequisites

### 1. Start the Application

**Backend API:**
```powershell
cd f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI
dotnet run --project POS.API
```

**Angular Frontend:**
```powershell
cd f:\MIllyass\pos-with-inventory-management\SourceCode\Angular
npm start
```

### 2. Login to Application

- Navigate to `http://localhost:4200`
- Login with your credentials
- Ensure you have necessary permissions for Products, Customers, and Suppliers

---

## Test Scenarios

### Scenario 1: Template Download

**Objective:** Verify that templates can be downloaded successfully.

#### Test Steps:

1. **Navigate to Product List**
   - Go to Products menu
   - Click "Import" button
   - Import dialog should open

2. **Download Excel Template**
   - Click "Download Excel Template" button
   - File `Product_Template.xlsx` should download
   - Open the file and verify:
     - ✅ Headers are present (Code, Name, Category, Brand, Unit, etc.)
     - ✅ Sample data row exists
     - ✅ Excel dropdowns work for Category, Brand, Unit columns

3. **Download CSV Template**
   - Click "Download CSV Template" button
   - File `Product_Template.csv` should download
   - Open the file and verify:
     - ✅ Headers are comma-separated
     - ✅ Sample data row exists

4. **Repeat for Customers and Suppliers**
   - Test Customer template download
   - Test Supplier template download

**Expected Result:** All templates download successfully with correct format and sample data.

---

### Scenario 2: Valid Data Import

**Objective:** Import valid data successfully.

#### Test Data - Products

Create a CSV file `products_test.csv`:

```csv
Code,Name,Category,Brand,Unit,Purchase Price,Sales Price,Description
PROD001,Test Product 1,Electronics,Samsung,Piece,100,150,Test product description
PROD002,Test Product 2,Electronics,LG,Piece,200,300,Another test product
PROD003,Test Product 3,Furniture,IKEA,Piece,500,750,Furniture item
```

**Note:** Replace Category, Brand, and Unit with actual values from your database.

#### Test Steps:

1. **Prepare Test File**
   - Create the CSV file with valid data
   - Ensure Categories, Brands, and Units exist in database

2. **Import Products**
   - Navigate to Product List
   - Click "Import" button
   - Drag and drop `products_test.csv` or click to browse
   - Verify file name appears
   - Click "Import" button

3. **Verify Success**
   - ✅ Success message: "Successfully imported 3 of 3 records"
   - ✅ Dialog closes automatically
   - ✅ Product grid refreshes
   - ✅ New products appear in the list

4. **Verify Data Integrity**
   - Click on each imported product
   - Verify all fields are correctly populated
   - Check prices, descriptions, and relationships

**Expected Result:** All 3 products imported successfully with correct data.

---

### Scenario 3: Import with Validation Errors

**Objective:** Verify validation errors are displayed correctly.

#### Test Data - Products with Errors

Create `products_errors.csv`:

```csv
Code,Name,Category,Brand,Unit,Purchase Price,Sales Price,Description
,Missing Code,Electronics,Samsung,Piece,100,150,Missing code
PROD004,Missing Category,,Samsung,Piece,100,150,Missing category
PROD005,Invalid Price,Electronics,Samsung,Piece,100,50,Sales price less than purchase
PROD001,Duplicate Code,Electronics,Samsung,Piece,100,150,Duplicate code (if PROD001 exists)
```

#### Test Steps:

1. **Import File with Errors**
   - Navigate to Product List
   - Click "Import" button
   - Upload `products_errors.csv`
   - Click "Import"

2. **Verify Error Display**
   - ✅ Error message: "Import completed with X errors"
   - ✅ Error table appears showing:
     - Row numbers (2, 3, 4, 5)
     - Field names (Code, Category, Sales Price)
     - Error messages
   - ✅ Dialog remains open
   - ✅ No data is imported (transaction rollback)

3. **Review Error Details**
   - Verify each error message is clear and actionable
   - Check row numbers match the CSV file

**Expected Result:** All validation errors displayed correctly, no partial imports.

---

### Scenario 4: Customer Import

**Objective:** Test customer import with address handling.

#### Test Data - Customers

Create `customers_test.csv`:

```csv
Customer Name,Contact Person,Email,Mobile No,Phone No,Website,Tax Number,Billing Address,Billing City,Billing Country,Shipping Address,Shipping City,Shipping Country,Description
ABC Company,John Doe,john@abc.com,+92-300-1234567,042-12345678,www.abc.com,1234567-8,123 Main St,Lahore,Pakistan,123 Main St,Lahore,Pakistan,VIP Customer
XYZ Corp,Jane Smith,jane@xyz.com,+92-321-9876543,042-87654321,www.xyz.com,9876543-2,456 Business Ave,Karachi,Pakistan,789 Warehouse Rd,Karachi,Pakistan,Regular Customer
```

#### Test Steps:

1. **Import Customers**
   - Navigate to Customer List
   - Click "Import" button
   - Upload `customers_test.csv`
   - Click "Import"

2. **Verify Success**
   - ✅ Success message appears
   - ✅ 2 customers imported
   - ✅ Grid refreshes

3. **Verify Address Handling**
   - Edit first customer
   - Verify billing address is populated
   - Verify shipping address is populated
   - Edit second customer
   - Verify different billing and shipping addresses

**Expected Result:** Customers imported with correct address data.

---

### Scenario 5: Supplier Import

**Objective:** Test supplier import with required address validation.

#### Test Data - Suppliers

Create `suppliers_test.csv`:

```csv
Supplier Name,Contact Person,Email,Mobile No,Phone No,Website,Tax Number,Billing Address,Billing City,Billing Country,Shipping Address,Shipping City,Shipping Country,Description
Tech Suppliers Ltd,Ahmed Ali,info@techsuppliers.com,+92-300-1111111,042-11111111,www.techsuppliers.com,1111111-1,100 Tech Park,Islamabad,Pakistan,,,Preferred supplier
Office Supplies Co,Sara Khan,sara@officesupplies.com,+92-321-2222222,042-22222222,www.officesupplies.com,2222222-2,200 Office Plaza,Lahore,Pakistan,200 Office Plaza,Lahore,Pakistan,Office supplies
```

#### Test Steps:

1. **Import Suppliers**
   - Navigate to Supplier List
   - Click "Import" button
   - Upload `suppliers_test.csv`
   - Click "Import"

2. **Verify Auto-fill Shipping Address**
   - Edit first supplier (Tech Suppliers Ltd)
   - Verify shipping address auto-filled from billing
   - Edit second supplier
   - Verify shipping address matches provided data

**Expected Result:** Suppliers imported with correct address handling.

---

### Scenario 6: Data Export

**Objective:** Verify data export functionality.

#### Test Steps:

1. **Export Products to Excel**
   - Navigate to Product List
   - Click "Export" button
   - Select "Export to Excel"
   - File `Products_YYYY-MM-DD.xlsx` downloads
   - Open file and verify:
     - ✅ All products are listed
     - ✅ All columns have data
     - ✅ Formatting is correct

2. **Export Products to CSV**
   - Click "Export" button
   - Select "Export to CSV"
   - File `Products_YYYY-MM-DD.csv` downloads
   - Open file and verify data

3. **Export Customers**
   - Navigate to Customer List
   - Export to Excel and CSV
   - Verify address data is included

4. **Export Suppliers**
   - Navigate to Supplier List
   - Export to Excel and CSV
   - Verify all data is present

**Expected Result:** All exports contain complete and accurate data.

---

### Scenario 7: Large File Import

**Objective:** Test performance with large datasets.

#### Test Steps:

1. **Create Large Dataset**
   - Generate CSV with 100+ products
   - Use Excel to duplicate rows or write a script

2. **Import Large File**
   - Navigate to Product List
   - Click "Import"
   - Upload large file
   - Observe:
     - ✅ Progress bar appears
     - ✅ No UI freezing
     - ✅ Success message shows correct count

3. **Verify Performance**
   - Import should complete within reasonable time
   - All records should be imported
   - Grid should refresh properly

**Expected Result:** Large imports handled efficiently without errors.

---

### Scenario 8: File Format Validation

**Objective:** Verify only valid file types are accepted.

#### Test Steps:

1. **Try Invalid File Types**
   - Try uploading `.txt` file
   - Try uploading `.pdf` file
   - Try uploading `.docx` file

2. **Verify Rejection**
   - ✅ Error message: "Please select a valid CSV or Excel file"
   - ✅ File not accepted
   - ✅ Import button remains disabled

3. **Try Valid File Types**
   - Upload `.csv` file - ✅ Accepted
   - Upload `.xlsx` file - ✅ Accepted
   - Upload `.xls` file - ✅ Accepted

**Expected Result:** Only CSV and Excel files accepted.

---

### Scenario 9: Drag and Drop

**Objective:** Test drag-and-drop file upload.

#### Test Steps:

1. **Open Import Dialog**
   - Navigate to any list page
   - Click "Import" button

2. **Drag and Drop File**
   - Drag a CSV file from file explorer
   - Drop it on the drop zone
   - Verify:
     - ✅ Drop zone highlights on drag over
     - ✅ File name appears after drop
     - ✅ Import button becomes enabled

3. **Remove File**
   - Click the "X" button next to file name
   - Verify:
     - ✅ File name disappears
     - ✅ Import button becomes disabled

**Expected Result:** Drag-and-drop works smoothly with visual feedback.

---

### Scenario 10: Error Recovery

**Objective:** Test error handling and recovery.

#### Test Steps:

1. **Network Error Simulation**
   - Stop the backend API
   - Try to import a file
   - Verify:
     - ✅ Error message appears
     - ✅ Dialog remains open
     - ✅ User can retry

2. **Malformed File**
   - Create CSV with mismatched columns
   - Try to import
   - Verify graceful error handling

3. **Fix and Retry**
   - Fix the errors in the file
   - Import again
   - Verify success

**Expected Result:** Errors handled gracefully with clear messages.

---

## Test Checklist

### Product Import/Export
- [ ] Download Excel template
- [ ] Download CSV template
- [ ] Import valid products (CSV)
- [ ] Import valid products (Excel)
- [ ] Import with validation errors
- [ ] Export to Excel
- [ ] Export to CSV
- [ ] Large file import (100+ records)

### Customer Import/Export
- [ ] Download templates
- [ ] Import with addresses
- [ ] Import with missing optional fields
- [ ] Verify email validation
- [ ] Export customers

### Supplier Import/Export
- [ ] Download templates
- [ ] Import with required addresses
- [ ] Verify auto-fill shipping from billing
- [ ] Export suppliers

### UI/UX
- [ ] Drag and drop works
- [ ] File validation works
- [ ] Progress bar appears during import
- [ ] Error table displays correctly
- [ ] Success messages appear
- [ ] Dialog closes on success
- [ ] Grid refreshes after import

### Error Handling
- [ ] Invalid file types rejected
- [ ] Validation errors displayed
- [ ] Network errors handled
- [ ] Malformed files handled
- [ ] Transaction rollback on errors

---

## Common Issues and Solutions

### Issue 1: "Category not found" Error

**Cause:** Category name in CSV doesn't match database exactly.

**Solution:**
- Download template to see exact category names
- Use exact spelling and capitalization
- Or create the category first

### Issue 2: Import Button Disabled

**Cause:** No file selected or invalid file type.

**Solution:**
- Ensure file is CSV or Excel format
- Check file is properly selected
- Try drag-and-drop instead

### Issue 3: "Duplicate Code" Error

**Cause:** Product code already exists in database.

**Solution:**
- Use unique codes for new products
- Or update existing products instead

### Issue 4: Template Download Not Working

**Cause:** Backend API not running or CORS issue.

**Solution:**
- Verify API is running
- Check browser console for errors
- Verify API endpoint is accessible

---

## Sample Test Data Files

### Minimal Valid Product

```csv
Code,Name,Category,Brand,Unit,Purchase Price,Sales Price
TEST001,Test Item,Electronics,Samsung,Piece,100,150
```

### Minimal Valid Customer

```csv
Customer Name,Mobile No,Billing Address,Billing City,Billing Country
Test Customer,+92-300-1234567,123 Test St,Lahore,Pakistan
```

### Minimal Valid Supplier

```csv
Supplier Name,Mobile No,Billing Address,Billing City,Billing Country
Test Supplier,+92-300-1234567,456 Supplier Ave,Karachi,Pakistan
```

---

## Performance Benchmarks

**Expected Performance:**
- Template download: < 1 second
- Import 10 records: < 2 seconds
- Import 100 records: < 10 seconds
- Import 1000 records: < 60 seconds
- Export 100 records: < 3 seconds

---

## Reporting Issues

When reporting issues, include:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Sample data file** (if applicable)
5. **Browser console errors**
6. **Network tab errors**

---

## Success Criteria

✅ All templates download correctly
✅ Valid data imports successfully
✅ Validation errors display clearly
✅ No partial imports on errors
✅ Export contains all data
✅ UI is responsive and user-friendly
✅ Error messages are clear and actionable
✅ Large files handled efficiently

---

## Next Steps After Testing

1. **Fix any bugs found**
2. **Optimize performance if needed**
3. **Add user documentation**
4. **Train users on the feature**
5. **Monitor production usage**

---

## Contact

For questions or issues during testing, contact the development team.
