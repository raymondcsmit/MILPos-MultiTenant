# Business Requirement Document (BRD)
## POS with Inventory Management System

**Version:** 1.0
**Date:** 2026-02-04
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Purpose
The purpose of this document is to define the business requirements for the "POS with Inventory Management System". This system is a comprehensive, multi-tenant web application designed to streamline retail operations. It integrates Point of Sale (POS) functionality with robust inventory tracking, accounting, purchasing, and customer relationship management (CRM).

### 1.2 Scope
The system covers the entire retail lifecycle:
- **Front Office:** POS interface for cashiers, customer management.
- **Back Office:** Inventory control, procurement, financial accounting, human resources (payroll), and reporting.
- **Administration:** Multi-tenancy support, user role management, and system configuration.
- **Integrations:** FBR (Federal Board of Revenue) tax compliance, Email notifications.

---

## 2. User Roles and Personas

Based on the system's permission structure, the following key roles are identified:

| Role | Description | Key Responsibilities |
|------|-------------|----------------------|
| **Super Admin** | System Owner | Manage tenants, subscriptions, and global settings. |
| **Tenant Admin** | Business Owner | Full access to all modules within their organization. Manage users, roles, and financial years. |
| **Store Manager** | Operations Lead | Oversee inventory, approve purchase orders, manage pricing, and view reports. |
| **Accountant** | Financial Officer | Manage ledgers, expenses, payroll, loans, and financial reporting. |
| **Cashier** | Front-line Staff | Operate the POS terminal, process sales, handle returns, and manage daily cash. |
| **Inventory Clerk** | Stock Keeper | Manage stock receipts, transfers between warehouses, and stock adjustments. |

---

## 3. Functional Requirements

### 3.1 Authentication & Security
- **Multi-Tenancy:** The system must support multiple tenants (businesses) isolated by subdomain or logical separation.
- **Authentication:** Secure login using JWT (JSON Web Tokens).
- **Authorization:** Granular Role-Based Access Control (RBAC) with specific claims (e.g., `PRO_ADD_PRODUCT`, `POS_POS`).
- **Audit Logs:** Track user login history (`LoginAudit`) and critical actions.
- **License Management:** Capability to activate/deactivate tenant licenses.

### 3.2 Inventory Management
- **Product Management:**
  - Create/Update products with SKU, Barcode, Name, and Description.
  - Support for **Product Variants** (e.g., Size, Color) with hierarchical parent-child relationships.
  - Categorization via Brands, Categories, and Units.
  - Tax configuration per product.
- **Stock Control:**
  - **Batch Tracking:** Track inventory by batches with Manufacturing and Expiry dates.
  - **Multi-Location:** Manage stock across multiple branches/warehouses.
  - **Stock Operations:** Support Stock Transfers, Stock Adjustments (Damaged/Lost), and Opening Stock entry.
  - **Alerts:** Low stock threshold notifications.
- **Pricing:**
  - Manage Cost Price, Sales Price, and MRP.
  - **Daily Price Manager:** Feature to update prices daily for volatile commodities.
  - Label Printing: Generate barcode labels for products.

### 3.3 Sales Management
- **Point of Sale (POS):**
  - Touch-friendly interface for rapid checkout.
  - Support for Barcode scanning.
  - Handle multiple payment methods (Cash, Card, etc.).
  - Hold/Resume transactions.
- **Sales Workflow:**
  - **Sales Order Request:** Draft initial customer requests.
  - **Sales Order:** Confirm orders, manage delivery status.
  - **Invoicing:** Generate tax-compliant invoices.
  - **Sales Return:** Process returns and refund/credit customers.
- **FBR Integration:**
  - Real-time invoice submission to FBR (Pakistan Tax Authority).
  - Print FBR QR code and Invoice Number on receipts.

### 3.4 Purchase Management
- **Supplier Management:** Maintain supplier database and contact details.
- **Procurement Cycle:**
  - **Purchase Request:** Internal requests for stock.
  - **Purchase Order (PO):** Formal orders to suppliers.
  - **Goods Receipt (GRN):** Receive stock into inventory (updates Batch/Expiry).
  - **Purchase Return:** Return defective goods to suppliers.

### 3.5 Financial Accounting
- **Double-Entry Ledger:** Full accounting system with Debits and Credits.
- **Chart of Accounts:** Manage Assets, Liabilities, Equity, Income, and Expenses.
- **Transactions:** Record generic financial transactions (Journal Entries).
- **Expense Management:** Track operational expenses with categories and tax.
- **Financial Years:** Manage fiscal periods and closing.
- **Loans:** Track employee or business loans and repayments.
- **Payroll:** Manage employee salaries and payment modes.

### 3.6 Customer Relationship Management (CRM)
- **Customer Database:** Track customer details, credit limits, and transaction history.
- **Customer Ledger:** View financial statement (Receivables) per customer.
- **Inquiry Management:** Track sales inquiries, sources, and activity logs.
- **Pending Payments:** Track and collect outstanding invoices.

### 3.7 Utilities & System Configuration
- **Reminders:** Set up One-time or Recurring reminders (Daily, Quarterly, Half-Yearly).
- **Email System:**
  - SMTP Configuration.
  - Customizable Email Templates.
  - Send generic emails from the system.
- **Logging:** Centralized NLog viewer for system diagnostics.
- **Import/Export:** Support for bulk data import/export (likely CSV/Excel).

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Response Time:** API response time should be under 500ms for standard operations.
- **Scalability:** Architecture must support horizontal scaling (currently configured for Cloud/Desktop modes).
- **Database:** Support for lightweight (SQLite) and enterprise (SQL Server) databases based on deployment size.

### 4.2 Usability
- **Interface:** Responsive web design using Angular Material components.
- **Localization:** Support for multiple languages (i18n) including English, Arabic, French, Spanish, etc.

### 4.3 Reliability
- **Offline Capability:** (To be confirmed) POS should ideally handle temporary disconnects (though current architecture is web-server based).
- **Data Integrity:** Use of transactions for all financial and inventory movements.

---

## 5. Technical Architecture

### 5.1 Technology Stack
- **Frontend:** Angular 17+ (Standalone Components, Signals).
- **Backend:** ASP.NET Core Web API (.NET 6/7/8).
- **Database:** Entity Framework Core supporting SQL Server and SQLite.
- **Logging:** NLog.
- **Architecture Pattern:** Clean Architecture with CQRS (Command Query Responsibility Segregation) and MediatR.

### 5.2 Deployment
- **Cloud:** Hosted on IIS/Azure App Service.
- **Desktop:** Potential for self-hosted desktop deployment (implied by `appsettings.Desktop.json`).

---

## 6. Integration Requirements

### 6.1 FBR (Federal Board of Revenue)
- **API Protocol:** REST/SOAP (depending on FBR spec).
- **Data:** Invoice Number, USIN, Customer Details, Tax Amounts.
- **Security:** Bearer Token authentication with FBR portal.

### 6.2 Email Services
- **SMTP:** Standard SMTP integration for sending transactional emails (Invoices, OTPs, Alerts).

---

## 7. Future Roadmap (Out of Scope for v1.0)
- **E-commerce Integration:** Sync inventory with Shopify/WooCommerce.
- **Mobile App:** Native mobile app for managers.
- **Advanced AI Forecasting:** Demand prediction based on sales history.
