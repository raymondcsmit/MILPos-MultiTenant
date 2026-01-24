using System;
using System.Collections.Generic;
using System.Linq;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Dto.Acconting.Report;
using POS.Data.Dto.SalesOrder;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;

namespace POS.Repository
{
    public class PropertyMappingService : IPropertyMappingService
    {
        private Dictionary<string, PropertyMappingValue> _loginAuditMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "UserName", new PropertyMappingValue(new List<string>() { "UserName" } )},
                { "LoginTime", new PropertyMappingValue(new List<string>() { "LoginTime" } )},
                { "RemoteIP", new PropertyMappingValue(new List<string>() { "RemoteIP" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "Status" } )},
                { "Provider", new PropertyMappingValue(new List<string>() { "Provider" } )}
            };

        private Dictionary<string, PropertyMappingValue> _userMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "UserName", new PropertyMappingValue(new List<string>() { "UserName" } )},
                { "Email", new PropertyMappingValue(new List<string>() { "Email" } )},
                { "FirstName", new PropertyMappingValue(new List<string>() { "FirstName" } )},
                { "LastName", new PropertyMappingValue(new List<string>() { "LastName" } )},
                { "PhoneNumber", new PropertyMappingValue(new List<string>() { "PhoneNumber" } )},
                { "IsActive", new PropertyMappingValue(new List<string>() { "IsActive" } )}
            };

        private Dictionary<string, PropertyMappingValue> _nLogMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "MachineName", new PropertyMappingValue(new List<string>() { "MachineName" } )},
                { "Logged", new PropertyMappingValue(new List<string>() { "Logged" } )},
                { "Level", new PropertyMappingValue(new List<string>() { "Level" } )},
                { "Message", new PropertyMappingValue(new List<string>() { "Message" } )},
                { "Logger", new PropertyMappingValue(new List<string>() { "Logger" } )},
                { "Properties", new PropertyMappingValue(new List<string>() { "Properties" } )},
                { "Callsite", new PropertyMappingValue(new List<string>() { "Callsite" } )},
                { "Exception", new PropertyMappingValue(new List<string>() { "Exception" } )},
                { "Source", new PropertyMappingValue(new List<string>() { "Source" } )}
            };

        private Dictionary<string, PropertyMappingValue> _supplierPropertyMapping =
              new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
              {
                       { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                       { "SupplierName", new PropertyMappingValue(new List<string>() { "SupplierName" } )},
                       { "ContactPerson", new PropertyMappingValue(new List<string>() { "ContactPerson" } )},
                       { "Email", new PropertyMappingValue(new List<string>() { "Email" } )},
                       { "MobileNo", new PropertyMappingValue(new List<string>() { "MobileNo" } )},
                       { "PhoneNo", new PropertyMappingValue(new List<string>() { "PhoneNo" } )},
                       { "Website", new PropertyMappingValue(new List<string>() { "Website" } )},
                       { "IsVarified", new PropertyMappingValue(new List<string>() { "IsVarified" } )},
                       { "IsUnsubscribe", new PropertyMappingValue(new List<string>() { "IsUnsubscribe" } )},
                       { "BusinessType", new PropertyMappingValue(new List<string>() { "BusinessType" } )}
              };

        private Dictionary<string, PropertyMappingValue> _customerPropertyMapping =
          new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
          {
                       { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                       { "CustomerName", new PropertyMappingValue(new List<string>() { "CustomerName" } )},
                       { "ContactPerson", new PropertyMappingValue(new List<string>() { "ContactPerson" } )},
                       { "Email", new PropertyMappingValue(new List<string>() { "Email" } )},
                       { "MobileNo", new PropertyMappingValue(new List<string>() { "MobileNo" } )},
                       { "PhoneNo", new PropertyMappingValue(new List<string>() { "PhoneNo" } )},
                       { "Website", new PropertyMappingValue(new List<string>() { "Website" } )},
                       { "IsVarified", new PropertyMappingValue(new List<string>() { "IsVarified" } )},
                       { "IsUnsubscribe", new PropertyMappingValue(new List<string>() { "IsUnsubscribe" } )}

          };

        private Dictionary<string, PropertyMappingValue> _contactUsPropertyMapping =
          new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
          {
                           { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                           { "Name", new PropertyMappingValue(new List<string>() { "Name" } )},
                           { "Email", new PropertyMappingValue(new List<string>() { "Email" } )},
                           { "Phone", new PropertyMappingValue(new List<string>() { "Phone" } )},
                           { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" }, true )}
          };

        private Dictionary<string, PropertyMappingValue> _reminderMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "Subject", new PropertyMappingValue(new List<string>() { "Subject" } )},
                { "Message", new PropertyMappingValue(new List<string>() { "Message" } )},
                { "Frequency", new PropertyMappingValue(new List<string>() { "Frequency" } )},
                { "StartDate", new PropertyMappingValue(new List<string>() { "StartDate" },true )},
                { "EndDate", new PropertyMappingValue(new List<string>() { "EndDate" },true )},
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" } )},
                { "IsRepeated", new PropertyMappingValue(new List<string>() { "IsRepeated" } )},
                { "IsEmailNotification", new PropertyMappingValue(new List<string>() { "IsEmailNotification" } )},
                { "IsActive", new PropertyMappingValue(new List<string>() { "IsActive" } )}
            };

        private Dictionary<string, PropertyMappingValue> _reminderSchedulerMapping =
           new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
           {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "Subject", new PropertyMappingValue(new List<string>() { "Subject" } )},
                { "Message", new PropertyMappingValue(new List<string>() { "Message" } )},
                { "IsRead", new PropertyMappingValue(new List<string>() { "IsRead" } )},
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" }, true )}
           };

        private Dictionary<string, PropertyMappingValue> _purchaseOrderMapping =
           new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
           {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "POCreatedDate", new PropertyMappingValue(new List<string>() { "POCreatedDate" }, true )},
                { "DeliveryDate", new PropertyMappingValue(new List<string>() { "DeliveryDate" }, true )},
                { "OrderNumber", new PropertyMappingValue(new List<string>() { "OrderNumber" } )},
                { "SupplierName", new PropertyMappingValue(new List<string>() { "Supplier.SupplierName" } )},
                { "TotalAmount", new PropertyMappingValue(new List<string>() { "TotalAmount" } )},
                { "TotalQuantity", new PropertyMappingValue(new List<string>() { "TotalQuantity" } )},
                { "TotalDiscount", new PropertyMappingValue(new List<string>() { "TotalDiscount" } )},
                { "TotalTax", new PropertyMappingValue(new List<string>() { "TotalTax" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "Status" } )},
                { "PricePerUnit", new PropertyMappingValue(new List<string>() { "PricePerUnit" } )},
                { "IsClosed", new PropertyMappingValue(new List<string>() { "IsClosed" } )},
                { "InStockQuantity", new PropertyMappingValue(new List<string>() { "InStockQuantity" } )},
                { "PaymentStatus", new PropertyMappingValue(new List<string>() { "PaymentStatus" } )},
                { "TotalPaidAmount", new PropertyMappingValue(new List<string>() { "TotalPaidAmount" } )},
                { "TotalPendingAmount", new PropertyMappingValue(new List<string>() { "TotalPendingAmount" } )},
                { "modifiedDate",new PropertyMappingValue(new List<string>() { "modifiedDate" }, true )},
                { "BusinessLocation", new PropertyMappingValue(new List<string>() { "Location.Name" } )},
                { "SupplierTaxNumber", new PropertyMappingValue(new List<string>() { "Supplier.TaxNumber" } )},
                { "CreatedByName", new PropertyMappingValue(new List<string>() { "CreatedByUser.FirstName" } )},
                { "DeliveryStatus", new PropertyMappingValue(new List<string>() { "DeliveryStatus" } )},
                { "TotalRefundAmount", new PropertyMappingValue(new List<string>() { "TotalRefundAmount" } )},
           };

        private Dictionary<string, PropertyMappingValue> _salesOrderMapping =
       new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
       {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "SOCreatedDate", new PropertyMappingValue(new List<string>() { "SOCreatedDate" }, true )},
                { "OrderNumber", new PropertyMappingValue(new List<string>() { "OrderNumber" } )},
                { "CustomerName", new PropertyMappingValue(new List<string>() { "Customer.CustomerName" } )},
                { "TotalAmount", new PropertyMappingValue(new List<string>() { "TotalAmount" } )},
                { "TotalQuantity", new PropertyMappingValue(new List<string>() { "TotalQuantity" } )},
                { "PricePerUnit", new PropertyMappingValue(new List<string>() { "PricePerUnit" } )},
                { "TotalDiscount", new PropertyMappingValue(new List<string>() { "TotalDiscount" } )},
                { "DeliveryDate", new PropertyMappingValue(new List<string>() { "DeliveryDate" } )},
                { "DeliveryStatus", new PropertyMappingValue(new List<string>() { "DeliveryStatus" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "Status" } )},
                { "PaymentStatus", new PropertyMappingValue(new List<string>() { "PaymentStatus" } )},
                { "TotalTax", new PropertyMappingValue(new List<string>() { "TotalTax" } )},
                { "IsClosed", new PropertyMappingValue(new List<string>() { "IsClosed" } )},
                { "InStockQuantity", new PropertyMappingValue(new List<string>() { "InStockQuantity" } )},
                { "ModifiedDate",new PropertyMappingValue(new List<string>() { "ModifiedDate" }, true )},
                { "TotalPaidAmount", new PropertyMappingValue(new List<string>() { "TotalPaidAmount" } )},
                { "TotalPendingAmount", new PropertyMappingValue(new List<string>() { "TotalPendingAmount" } )},
                { "CreatedByName", new PropertyMappingValue(new List<string>() { "CreatedByUser.FirstName" } )},
                { "CreatedBBusinessLocationyName", new PropertyMappingValue(new List<string>() { "Location.Name" } )},
                { "BusinessLocation", new PropertyMappingValue(new List<string>() { "Location.Name" } )},
                { "TotalRefundAmount", new PropertyMappingValue(new List<string>() { "TotalRefundAmount" } )},

       };

        private Dictionary<string, PropertyMappingValue> _expenseMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Reference", new PropertyMappingValue(new List<string>() { "Reference" } ) },
                { "ExpenseCategoryId", new PropertyMappingValue(new List<string>() { "ExpenseCategoryId" } )},
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" }, true )},
                { "Description", new PropertyMappingValue(new List<string>() { "Description" } )},
                { "Amount", new PropertyMappingValue(new List<string>() { "Amount" } )},
                { "ExpenseBy", new PropertyMappingValue(new List<string>() { "ExpenseBy.FirstName" } )},
                { "ExpenseCategory", new PropertyMappingValue(new List<string>() { "ExpenseCategory.Name" } )},
                { "ExpenseDate", new PropertyMappingValue(new List<string>() { "ExpenseDate" }, true )},
                { "ExpenseById", new PropertyMappingValue(new List<string>() { "ExpenseById" })},
                { "TotalTax", new PropertyMappingValue(new List<string>() { "TotalTax" })},
                { "Location", new PropertyMappingValue(new List<string>() { "Location.Name" } )}
            };

        private Dictionary<string, PropertyMappingValue> _productMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Name", new PropertyMappingValue(new List<string>() { "Name" } ) },
                { "CategoryName", new PropertyMappingValue(new List<string>() { "ProductCategory.Name" } )},
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" }, true )},
                { "UnitName", new PropertyMappingValue(new List<string>() { "Unit.Name" } )},
                { "BrandName", new PropertyMappingValue(new List<string>() { "Brand.Name" } )},
                { "PurchasePrice", new PropertyMappingValue(new List<string>() { "PurchasePrice" } )},
                { "SalesPrice", new PropertyMappingValue(new List<string>() { "SalesPrice" })},
                { "Mrp", new PropertyMappingValue(new List<string>() { "Mrp" })},
                { "AlertQuantity" ,new PropertyMappingValue(new List<string>() { "AlertQuantity" })},
                { "SkuCode" ,new PropertyMappingValue(new List<string>() { "SkuCode" })},
                { "SkuName" ,new PropertyMappingValue(new List<string>() { "SkuName" })},
                { "Margin" ,new PropertyMappingValue(new List<string>() { "Margin" })}
            };


        private Dictionary<string, PropertyMappingValue> _cityMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "CityName", new PropertyMappingValue(new List<string>() { "CityName" } ) },
                { "CountryName", new PropertyMappingValue(new List<string>() { "Country.CountryName" } )},
            };

        private Dictionary<string, PropertyMappingValue> _inquiryPropertyMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "CompanyName", new PropertyMappingValue(new List<string>() { "CompanyName" } )},
                { "MobileNo", new PropertyMappingValue(new List<string>() { "MobileNo" } )},
                { "Phone", new PropertyMappingValue(new List<string>() { "Phone" } )},
                { "Email", new PropertyMappingValue(new List<string>() { "Email" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "InquiryStatus.Name" } )},
                { "Source", new PropertyMappingValue(new List<string>() { "InquirySource.Name" } )},
                { "CityName", new PropertyMappingValue(new List<string>() { "City.CityName" } )},
                { "AssignTo", new PropertyMappingValue(new List<string>() { "AssignUser.FirstName" } )},
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" }, true )}
            };

        private Dictionary<string, PropertyMappingValue> _purchaseOrderPaymentPropertyMapping =
        new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
        {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "PurchaseOrderId", new PropertyMappingValue(new List<string>() { "PurchaseOrderId" } )},
                { "OrderNumber", new PropertyMappingValue(new List<string>() { "PurchaseOrder.OrderNumber" } )},
                { "PaymentDate", new PropertyMappingValue(new List<string>() { "PaymentDate" }, true )},
                { "ReferenceNumber", new PropertyMappingValue(new List<string>() { "ReferenceNumber" } )},
                { "Amount", new PropertyMappingValue(new List<string>() { "Amount" } )},
                { "PaymentMethod", new PropertyMappingValue(new List<string>() { "PaymentMethod" } )},
                { "Note", new PropertyMappingValue(new List<string>() { "Note" } )}
        };
        private Dictionary<string, PropertyMappingValue> _salesOrderPaymentPropertyMapping =
         new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
         {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "SalesOrderId", new PropertyMappingValue(new List<string>() { "SalesOrderId" } )},
                { "OrderNumber", new PropertyMappingValue(new List<string>() { "SalesOrder.OrderNumber" } )},
                { "PaymentDate", new PropertyMappingValue(new List<string>() { "PaymentDate" }, true )},
                { "ReferenceNumber", new PropertyMappingValue(new List<string>() { "ReferenceNumber" } )},
                { "Amount", new PropertyMappingValue(new List<string>() { "Amount" } )},
                { "PaymentMethod", new PropertyMappingValue(new List<string>() { "PaymentMethod" } )},
                { "Note", new PropertyMappingValue(new List<string>() { "Note" } )}
         };

        private Dictionary<string, PropertyMappingValue> _purchaseOrderItemPropertyMapping =
          new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
          {
                    { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                    { "ProductId", new PropertyMappingValue(new List<string>() { "Product.ProductId" } )},
                    { "ProductName", new PropertyMappingValue(new List<string>() { "Product.Name" } )},
                    { "PurchaseOrderNumber", new PropertyMappingValue(new List<string>() { "PurchaseOrder.OrderNumber" })},
                    { "UnitName", new PropertyMappingValue(new List<string>() { "UnitName" } )},
                    { "TaxValue", new PropertyMappingValue(new List<string>() { "TaxValue" } )},
                    { "SupplierName", new PropertyMappingValue(new List<string>() { "PurchaseOrder.Supplier.SupplierName" } )},
                    { "POCreatedDate", new PropertyMappingValue(new List<string>() { "PurchaseOrder.POCreatedDate" }, true )},
          };

        private Dictionary<string, PropertyMappingValue> _salesOrderItemPropertyMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                    { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                    { "ProductId", new PropertyMappingValue(new List<string>() { "Product.ProductId" } )},
                    { "ProductName", new PropertyMappingValue(new List<string>() { "Product.Name" } )},
                    { "SalesOrderNumber", new PropertyMappingValue(new List<string>() { "SalesOrder.OrderNumber" })},
                    { "UnitName", new PropertyMappingValue(new List<string>() { "UnitName" } )},
                    { "TaxValue", new PropertyMappingValue(new List<string>() { "TaxValue" } )},
                    { "CustomerName", new PropertyMappingValue(new List<string>() { "SalesOrder.Customer.CustomerName" } )},
                    { "SOCreatedDate", new PropertyMappingValue(new List<string>() { "SalesOrder.SOCreatedDate" }, true )}
            };

        private Dictionary<string, PropertyMappingValue> _emailLogPropertyMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "SenderEmail", new PropertyMappingValue(new List<string>() { "SenderEmail" } )},
                { "SentAt", new PropertyMappingValue(new List<string>() { "SentAt" } )},
                { "RecipientEmail", new PropertyMappingValue(new List<string>() { "RecipientEmail" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "Status" } )},
                { "Subject", new PropertyMappingValue(new List<string>() { "Subject" } )}
            };

        private Dictionary<string, PropertyMappingValue> _stockTransferPropertyMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "ReferenceNo", new PropertyMappingValue(new List<string>() { "ReferenceNo" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "Status" } )},
                { "FromLocationName", new PropertyMappingValue(new List<string>() { "FromLocation.Name" } )},
                { "ToLocationName", new PropertyMappingValue(new List<string>() { "ToLocation.Name" } )},
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "CreatedDate" }, true )},
                { "TransferDate", new PropertyMappingValue(new List<string>() { "TransferDate" }, true )},
                { "TotalAmount", new PropertyMappingValue(new List<string>() { "TotalAmount" } )},
                { "TotalShippingCharge", new PropertyMappingValue(new List<string>() { "TotalShippingCharge" } )}
            };

        private Dictionary<string, PropertyMappingValue> _damagedStockPropertyMapping =
         new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
         {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "DamagedDate", new PropertyMappingValue(new List<string>() { "DamagedDate" }, true )},
                { "Reason", new PropertyMappingValue(new List<string>() { "Reason" } )},
                { "DamagedQuantity", new PropertyMappingValue(new List<string>() { "DamagedQuantity" } )},
                { "Product", new PropertyMappingValue(new List<string>() { "Product.Name" } )},
                { "ReportedBy", new PropertyMappingValue(new List<string>() { "ReportedBy.FirstName" } )},
                { "CreatedByName", new PropertyMappingValue(new List<string>() { "CreatedByUser.FirstName" } )},
                { "Location", new PropertyMappingValue(new List<string>() { "Location.Name" } )}
         };

        private Dictionary<string, PropertyMappingValue> _productStockMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Stock", new PropertyMappingValue(new List<string>() { "CurrentStock" } ) },
                { "ProductName", new PropertyMappingValue(new List<string>() { "Product.Name" } )},
                { "Unit", new PropertyMappingValue(new List<string>() { "Product.Unit.Name" })},
                { "BusinessLocation", new PropertyMappingValue(new List<string>() { "Location.Name" } )}
            };
        private Dictionary<string, PropertyMappingValue> _transactionPropertyMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "TransactionNumber", new PropertyMappingValue(new List<string>() { "TransactionNumber" } )},
                { "TransactionType", new PropertyMappingValue(new List<string>() { "TransactionType" } )},
                { "BranchId", new PropertyMappingValue(new List<string>() { "BranchId" } )},
                { "SubTotal", new PropertyMappingValue(new List<string>() { "SubTotal" } )},
                { "TransactionDate", new PropertyMappingValue(new List<string>() { "TransactionDate" } )},
                { "DiscountAmount", new PropertyMappingValue(new List<string>() { "DiscountAmount" } )},
                { "TaxAmount", new PropertyMappingValue(new List<string>() { "TaxAmount" } )},
                { "RoundOffAmount", new PropertyMappingValue(new List<string>() { "RoundOffAmount" } )},
                { "TotalAmount", new PropertyMappingValue(new List<string>() { "TotalAmount" } )},
                { "Narration", new PropertyMappingValue(new List<string>() { "Narration" } )},
                { "ReferenceNumber", new PropertyMappingValue(new List<string>() { "ReferenceNumber" } )},
                { "Status", new PropertyMappingValue(new List<string>() { "Status" } )},
                { "PaymentStatus", new PropertyMappingValue(new List<string>() { "PaymentStatus" } )},
                { "PaidAmount", new PropertyMappingValue(new List<string>() { "PaidAmount" } )},
                { "BalanceAmount", new PropertyMappingValue(new List<string>() { "BalanceAmount" } )},
                { "BranchName", new PropertyMappingValue(new List<string>() { "Branch.Name" } )},
            };

        private Dictionary<string, PropertyMappingValue> _ledgerAccountPropertyMapping =
           new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
           {
                { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                { "AccountCode", new PropertyMappingValue(new List<string>() { "AccountCode" } )},
                { "AccountName", new PropertyMappingValue(new List<string>() { "AccountName" } )},
                { "AccountType", new PropertyMappingValue(new List<string>() { "AccountType" } )},
                { "AccountGroup", new PropertyMappingValue(new List<string>() { "AccountGroup" } )},
                { "ParentAccountId", new PropertyMappingValue(new List<string>() { "ParentAccountId" } )},
                { "OpeningBalance", new PropertyMappingValue(new List<string>() { "OpeningBalance" } )},
                { "IsActive", new PropertyMappingValue(new List<string>() { "IsActive" } )},
           };
        private Dictionary<string, PropertyMappingValue> _accountingEntrymapping =
        new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
        {
                { "TransactionNumber", new PropertyMappingValue(new List<string>() { "Transaction.TransactionNumber" } ) },
                { "DebitAmount", new PropertyMappingValue(new List<string>() { "Amount" } ) },
                { "CreditAmount", new PropertyMappingValue(new List<string>() { "Amount" } ) },
                { "CreatedDate", new PropertyMappingValue(new List<string>() { "EntryDate" }) },
        };

        private Dictionary<string, PropertyMappingValue> _customerSalesOrderPropertyMapping =
       new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
       {
                { "OrderNumber", new PropertyMappingValue(new List<string>() { "OrderNumber" } ) },
                { "CustomerName", new PropertyMappingValue(new List<string>() { "Customer.CustomerName" } ) },
                { "SOCreatedDate", new PropertyMappingValue(new List<string>() { "SOCreatedDate" } ) },
                { "TotalAmount", new PropertyMappingValue(new List<string>() { "TotalAmount" }) },
                { "TotalTax", new PropertyMappingValue(new List<string>() { "TotalTax" }) },
                { "TotalDiscount", new PropertyMappingValue(new List<string>() { "TotalDiscount" }) },
                { "TotalPaidAmount", new PropertyMappingValue(new List<string>() { "TotalPaidAmount" }) },
                { "PaymentStatus", new PropertyMappingValue(new List<string>() { "PaymentStatus" }) },
       };
     private readonly Dictionary<string, PropertyMappingValue> _customerLedgerPropertyMapping =
       new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
       {
         { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
         { "Date", new PropertyMappingValue(new List<string>() { "Date" }, true )},
         { "Reference", new PropertyMappingValue(new List<string>() { "Reference" } )},
         { "AccountId", new PropertyMappingValue(new List<string>() { "AccountId" } )},
         { "AccountName", new PropertyMappingValue(new List<string>() {"AccountName"}) },
         { "Note", new PropertyMappingValue(new List<string>() { "Note" } )},
         { "Description", new PropertyMappingValue(new List<string>() { "Description" } )},
         { "Amount", new PropertyMappingValue(new List<string>() { "Amount" } )},
         { "Balance", new PropertyMappingValue(new List<string>() { "Balance" } )},
         { "Overdue", new PropertyMappingValue(new List<string>() { "Overdue" } )},
         { "Location", new PropertyMappingValue(new List<string>() { "Location.Name" } )}
       };

        private readonly Dictionary<string, PropertyMappingValue> _payRollPropertyMapping =
    new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
    {
         { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
         { "EmployeeName", new PropertyMappingValue(new List<string>() { "Employee.FirstName" } )},
         { "BranchName", new PropertyMappingValue(new List<string>() { "Location.Name" } )},
         { "SalaryMonth", new PropertyMappingValue(new List<string>() { "SalaryMonth" } )},
         { "MobileBill", new PropertyMappingValue(new List<string>() { "MobileBill" } )},
         { "FoodBill", new PropertyMappingValue(new List<string>() { "FoodBill" } )},
         { "Bonus", new PropertyMappingValue(new List<string>() { "Bonus" } )},
         { "Commission", new PropertyMappingValue(new List<string>() { "Commission" } )},
         { "FestivalBonus", new PropertyMappingValue(new List<string>() { "FestivalBonus" } )},
         { "TravelAllowance", new PropertyMappingValue(new List<string>() { "TravelAllowance" } )},
         { "Others", new PropertyMappingValue(new List<string>() { "Others" } )},
         { "BasicSalary", new PropertyMappingValue(new List<string>() { "BasicSalary" } )},
         { "Advance", new PropertyMappingValue(new List<string>() { "Advance" } )},
         { "TotalSalary", new PropertyMappingValue(new List<string>() { "TotalSalary" } )},
         { "PaymentMode", new PropertyMappingValue(new List<string>() { "PaymentMode" } )},
         { "ChequeNo", new PropertyMappingValue(new List<string>() { "ChequeNo" } )},
         { "SalaryDate", new PropertyMappingValue(new List<string>() { "SalaryDate" } )},
         { "Note", new PropertyMappingValue(new List<string>() { "Note" } )},
         { "Attachment", new PropertyMappingValue(new List<string>() { "Attachment" } )}

    };

        private readonly Dictionary<string, PropertyMappingValue> _PaymentEntryPropertyMapping =
            new Dictionary<string, PropertyMappingValue>(StringComparer.OrdinalIgnoreCase)
            {
                     { "Id", new PropertyMappingValue(new List<string>() { "Id" } ) },
                     { "TransactionId", new PropertyMappingValue(new List<string>() { "TransactionId" } ) },
                     { "TransactionNumber", new PropertyMappingValue(new List<string>() { "Transaction.TransactionNumber" } ) },
                     { "BranchId", new PropertyMappingValue(new List<string>() { "BranchId" } ) },
                     { "BranchName", new PropertyMappingValue(new List<string>() { "Branch.Name" } ) },
                     { "PaymentMethod", new PropertyMappingValue(new List<string>() { "PaymentMethod" } ) },
                     { "Amount", new PropertyMappingValue(new List<string>() { "Amount" } ) },
                     { "PaymentDate", new PropertyMappingValue(new List<string>() { "PaymentDate" } ) },
                     { "ReferenceNumber", new PropertyMappingValue(new List<string>() { "ReferenceNumber" } ) },
                     { "Narration", new PropertyMappingValue(new List<string>() { "Narration" } ) },
                     { "Status", new PropertyMappingValue(new List<string>() { "Status" } ) },
                     { "CreatedAt", new PropertyMappingValue(new List<string>() { "CreatedAt" } ) },
            };


        private IList<IPropertyMapping> propertyMappings = new List<IPropertyMapping>();
        public PropertyMappingService()
        {
            propertyMappings.Add(new PropertyMapping<LoginAuditDto, LoginAudit>(_loginAuditMapping));
            propertyMappings.Add(new PropertyMapping<UserDto, User>(_userMapping));
            propertyMappings.Add(new PropertyMapping<NLogDto, NLog>(_nLogMapping));
            propertyMappings.Add(new PropertyMapping<SupplierDto, Supplier>(_supplierPropertyMapping));
            propertyMappings.Add(new PropertyMapping<CustomerDto, Customer>(_customerPropertyMapping));
            propertyMappings.Add(new PropertyMapping<ContactUsDto, ContactRequest>(_contactUsPropertyMapping));
            propertyMappings.Add(new PropertyMapping<ReminderDto, Reminder>(_reminderMapping));
            propertyMappings.Add(new PropertyMapping<ReminderSchedulerDto, ReminderScheduler>(_reminderSchedulerMapping));
            propertyMappings.Add(new PropertyMapping<PurchaseOrderDto, PurchaseOrder>(_purchaseOrderMapping));
            propertyMappings.Add(new PropertyMapping<SalesOrderDto, SalesOrder>(_salesOrderMapping));
            propertyMappings.Add(new PropertyMapping<ExpenseDto, Expense>(_expenseMapping));
            propertyMappings.Add(new PropertyMapping<ProductDto, Product>(_productMapping));
            propertyMappings.Add(new PropertyMapping<CityDto, City>(_cityMapping));
            propertyMappings.Add(new PropertyMapping<InquiryDto, Inquiry>(_inquiryPropertyMapping));
            propertyMappings.Add(new PropertyMapping<PurchaseOrderPaymentDto, PurchaseOrderPayment>(_purchaseOrderPaymentPropertyMapping));
            propertyMappings.Add(new PropertyMapping<SalesOrderPaymentDto, SalesOrderPayment>(_salesOrderPaymentPropertyMapping));
            propertyMappings.Add(new PropertyMapping<PurchaseOrderItemDto, PurchaseOrderItem>(_purchaseOrderItemPropertyMapping));
            propertyMappings.Add(new PropertyMapping<SalesOrderItemDto, SalesOrderItem>(_salesOrderItemPropertyMapping));
            propertyMappings.Add(new PropertyMapping<EmailLogDto, EmailLog>(_emailLogPropertyMapping));
            propertyMappings.Add(new PropertyMapping<StockTransferDto, StockTransfer>(_stockTransferPropertyMapping));
            propertyMappings.Add(new PropertyMapping<DamagedStockDto, DamagedStock>(_damagedStockPropertyMapping));
            propertyMappings.Add(new PropertyMapping<ProductStockDto, ProductStock>(_productStockMapping));
            // Accounting
            propertyMappings.Add(new PropertyMapping<TransactionDto, Transaction>(_transactionPropertyMapping));
            propertyMappings.Add(new PropertyMapping<GeneralEntryDto, AccountingEntry>(_accountingEntrymapping));
            propertyMappings.Add(new PropertyMapping<LedgerAccountDto, LedgerAccount>(_ledgerAccountPropertyMapping));
            propertyMappings.Add(new PropertyMapping<CustomerSalesOrderDto, SalesOrder>(_customerSalesOrderPropertyMapping));
            propertyMappings.Add(new PropertyMapping<CustomerLedgerDto, CustomerLedger>(_customerLedgerPropertyMapping));
            propertyMappings.Add(new PropertyMapping<PayrollDto, Payroll>(_payRollPropertyMapping));
            propertyMappings.Add(new PropertyMapping<PaymentEntryDto, PaymentEntry>(_PaymentEntryPropertyMapping));
        }
        public Dictionary<string, PropertyMappingValue> GetPropertyMapping
            <TSource, TDestination>()
        {
            // get matching mapping
            var matchingMapping = propertyMappings.OfType<PropertyMapping<TSource, TDestination>>();

            if (matchingMapping.Count() == 1)
            {
                return matchingMapping.First()._mappingDictionary;
            }

            throw new Exception($"Cannot find exact property mapping instance for <{typeof(TSource)},{typeof(TDestination)}");
        }

        public bool ValidMappingExistsFor<TSource, TDestination>(string fields)
        {
            var propertyMapping = GetPropertyMapping<TSource, TDestination>();

            if (string.IsNullOrWhiteSpace(fields))
            {
                return true;
            }

            // the string is separated by ",", so we split it.
            var fieldsAfterSplit = fields.Split(',');

            // run through the fields clauses
            foreach (var field in fieldsAfterSplit)
            {
                // trim
                var trimmedField = field.Trim();

                // remove everything after the first " " - if the fields 
                // are coming from an orderBy string, this part must be 
                // ignored
                var indexOfFirstSpace = trimmedField.IndexOf(" ");
                var propertyName = indexOfFirstSpace == -1 ?
                    trimmedField : trimmedField.Remove(indexOfFirstSpace);

                // find the matching property
                if (!propertyMapping.ContainsKey(propertyName))
                {
                    return false;
                }
            }
            return true;

        }

    }
}
