import { Routes } from '@angular/router';
import { App } from './app';
import { LayoutComponent } from '@core/layout/layout.component';
import { MyProfileComponent } from './user/my-profile/my-profile.component';
import { AuthGuard } from '@core/security/auth.guard';
import { TableSettingsGuard } from '@core/services/table-settings-gaurd';
import { RecoverPasswordResolver } from './recover-password/recover-password-resolver';
import { CompanyProfileResolver } from './company-profile/company-profile-resolver';
import { salesOrderTaxResolver } from './sales-order/sales-order-add-edit/sales-order-tax-resolver';
import { salesOrderUnitResolver } from './sales-order/sales-order-add-edit/sales-order-unit-resolver';

export const routes: Routes = [
  {
    path: '',
    component: App,
    resolve: { profile: CompanyProfileResolver },
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'activate-license',
        loadComponent: () =>
          import('./activate-license/activate-license.component').then((m) => m.ActivateLicenseComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./forgot-password/forgot-password.component')
            .then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password/:link',
        loadComponent: () =>
          import('./recover-password/recover-password.component')
            .then(m => m.RecoverPasswordComponent),
        resolve: {
          UserReset: RecoverPasswordResolver
        }
      },
      {
        path: 'error-msg',
        loadComponent: () => import('./error-msg/error-msg.component').then((m) => m.ErrorMsgComponent),
      },
      {
        path: '',
        component: LayoutComponent,
        children: [
          {
            path: '',
            data: {
              claimType: ['DB_STATISTICS',
                'DB_BEST_SELLING_PROS',
                'DB_RECENT_SO_SHIPMENT',
                'DB_RECENT_PO_DELIVERY',
                'DB_PROD_STOCK_ALERT']
            },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./dashboard/dashboard.component').then(
                (m) => m.DashboardComponent
              ),
          }, {
            path: 'my-profile',
            component: MyProfileComponent,
            canActivate: [AuthGuard],
          },
          {
            path: 'pos',
            loadComponent: () => import('./pos/pos.component').then((m) => m.PosComponent),
            data: {
              claimType: ['POS_POS'],
            },
            canActivate: [AuthGuard],
            resolve: {
              units: salesOrderUnitResolver,
              taxs: salesOrderTaxResolver,
            },
          },
          {
            path: 'remove-license-key',
            loadComponent: () =>
              import('./remove-license-key/remove-license-key.component').then(
                (m) => m.RemoveLicenseKeyComponent
              ),
            canActivate: [AuthGuard],
          },
          {
            path: 'pages',
            canLoad: [AuthGuard],
            data: { claimType: 'dummay_permission' },
            loadComponent: () =>
              import('./page/page-list/page-list.component').then((m) => m.PageListComponent),
          },
          {
            path: 'roles',
            canLoad: [AuthGuard],
            loadChildren: () =>
              import('./role/role-routes').then((m) => m.ROLE_ROUTES),
          },
          {
            path: 'users',
            canLoad: [AuthGuard],
            loadChildren: () =>
              import('./user/user-routes').then((m) => m.USER_ROUTES),
          },
          {
            path: 'login-audit',
            data: { claimType: 'LOGS_VIEW_LOGIN_AUDITS' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./login-audit/login-audit-list/login-audit-list.component').then(
                (m) => m.LoginAuditListComponent
              ),
          },
          {
            path: 'emailtemplate',
            canLoad: [AuthGuard],
            loadChildren: () =>
              import('./email-template/email-template-routes').then(
                (m) => m.EMAIL_TEMPLATE_ROUTES
              ),
          },
          {
            path: 'send-email',
            canActivate: [AuthGuard],
            data: { claimType: 'EMAIL_SEND_EMAIL' },
            loadComponent: () =>
              import('./email-send/email-send.component').then(
                (m) => m.EmailSendComponent
              ),
          },
          {
            path: 'email-smtp',
            canLoad: [AuthGuard],
            loadChildren: () =>
              import('./email-smtp-setting/email-smtp-setting-routes').then(
                (m) => m.EMAIL_SMTP_SETTING_ROUTES
              ),
          },
          {
            path: 'supplier',
            loadChildren: () =>
              import('./supplier/supplier-routes').then(
                (m) => m.SUPPLIER_ROUTES
              ),
          },
          {
            path: 'customer',
            loadChildren: () =>
              import('./customer/customer-routing').then(
                (m) => m.CUSTOMER_ROUTES
              ),
          },
          {
            path: 'notifications',
            loadComponent: () =>
              import('./notification/notification.component').then(
                (m) => m.NotificationComponent
              ),
          },
          {
            path: 'reminders',
            loadChildren: () =>
              import('./reminder/reminder-routes').then(
                (m) => m.REMINDER_ROUTES
              ),
          },
          {
            path: 'purchase-order',
            loadChildren: () =>
              import('./purchase-order/purchase-order-routes').then(
                (m) => m.PURCHASE_ORDER_ROUTES
              ),
          },
          {
            path: 'purchase-order-return',
            loadChildren: () =>
              import(
                './purchase-order-return/purchase-order-return-routes'
              ).then((m) => m.PURCHASE_ORDER_RETURNS_ROUTES),
          },
          {
            path: 'purchase-order-request',
            loadChildren: () =>
              import(
                './purchase-order-request/purchase-order-request-routes'
              ).then((m) => m.PURCHASE_ORDER_REQUEST_ROUTES),
          },
          {
            path: 'sales-order',
            loadChildren: () =>
              import('./sales-order/sales-order-routes').then(
                (m) => m.SALE_RODER_ROUTES
              ),
          },
          {
            path: 'sales-order-return',
            loadChildren: () =>
              import('./sale-order-return/sale-order-return-routes').then(
                (m) => m.SALE_ORDER_RETURN_ROUTES
              ),
          },
          {
            path: 'sales-order-request',
            loadChildren: () =>
              import('./sales-order-request/sales-order-request-routes').then(
                (m) => m.SALES_ORDER_REQUEST_ROUTES
              ),
          },
          {
            path: 'company-profile',
            canLoad: [AuthGuard],
            data: { claimType: 'SETT_UPDATE_COM_PROFILE' },
            resolve: {
              profile: CompanyProfileResolver
            },
            loadComponent: () =>
              import('./company-profile/company-profile.component').then(
                (m) => m.CompanyProfileComponent
              ),
          },
          {
            path: 'fbr-settings',
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./fbr-settings/fbr-settings.component').then(
                (m) => m.FBRSettingsComponent
              ),
          },
          {
            path: 'expense-category',
            canActivate: [AuthGuard],
            data: { claimType: 'EXP_MANAGE_EXP_CATEGORY' },
            loadComponent: () =>
              import('./expense-category/expense-category-list/expense-category-list.component').then(
                (m) => m.ExpenseCategoryListComponent
              ),
          },
          {
            path: 'expense',
            loadChildren: () =>
              import('./expense/expense-routes').then((m) => m.EXPENSE_ROUTES),
          },
          {
            path: 'inquiry',
            loadChildren: () =>
              import('./inquiry/inquiry-routes').then((m) => m.INQUIRY_ROUTES),
          },
          {
            path: 'inquiry-status',
            canActivate: [AuthGuard],
            data: { claimType: 'INQ_MANAGE_INQ_STATUS' },
            loadComponent: () =>
              import('./inquiry-status/inquiry-status-list/inquiry-status-list.component').then(
                (m) => m.InquiryStatusListComponent
              ),
          },
          {
            path: 'inquiry-source',
            canActivate: [AuthGuard],
            data: { claimType: 'INQ_MANAGE_INQ_SOURCE' },
            loadComponent: () =>
              import('./inquiry-source/inquiry-source-list/inquiry-source-list.component').then(
                (m) => m.InquirySourceListComponent
              ),
          },
          {
            path: 'product-category',
            canActivate: [AuthGuard],
            data: { claimType: 'PRO_MANAGE_PRO_CAT' },
            loadComponent: () =>
              import('./product-category/product-category-list/product-category-list.component').then(
                (m) => m.ProductCategoryListComponent
              ),
          },
          {
            path: 'products',
            loadChildren: () =>
              import('./product/product-routes').then((m) => m.PRODUCT_ROUTES),
          },
          {
            path: 'print-labels',
            loadComponent: () => import('./barcode-generator/barcode-generator.component').then((m) => m.BarcodeGeneratorComponent),
            data: { claimType: 'PRO_PRINT_LABELS' },
            canActivate: [AuthGuard]
          },
          {
            path: 'variants',
            data: { claimType: 'PRO_MANAGE_VARIANTS' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./variants/variants-list/variants-list.component').then(
                (m) => m.VariantsListComponent
              ),
          },
          {
            path: 'tax',
            data: { claimType: 'PRO_MANAGE_TAX' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./tax/tax-list/tax-list.component').then((m) => m.TaxListComponent),
          },
          {
            path: 'brand',
            data: { claimType: 'PRO_MANAGE_BRAND' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./brand/brand-list/brand-list.component').then((m) => m.BrandListComponent),
          },
          {
            path: 'country',
            data: { claimType: 'SETT_MANAGE_COUNTRY' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./country/country-list/country-list.component').then((m) => m.CountryListComponent),
          },
          {
            path: 'cities',
            data: { claimType: 'SETT_MANAGE_CITY' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./city/city-list/city-list.component').then((m) => m.CityListComponent),
          },
          {
            path: 'inventory',
            data: { claimType: 'INVE_VIEW_INVENTORIES' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./inventory/inventory-list/inventory-list.component').then(
                (m) => m.InventoryListComponent
              ),
          },
          {
            path: 'purchase-order-report',
            data: { claimType: 'REP_PO_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/purchase-order-report/purchase-order-report.component'
              ).then((m) => m.PurchaseOrderReportComponent),
          },
          {
            path: 'sales-order-report',
            data: { claimType: 'REP_SO_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/sales-order-report/sales-order-report.component'
              ).then((m) => m.SalesOrderReportComponent),
          },
          {
            path: 'purchase-payment-report',
            data: { claimType: 'REP_PO_PAYMENT_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/purchase-payment-report/purchase-payment-report.component'
              ).then((m) => m.PurchasePaymentReportComponent),
          },
          {
            path: 'sales-payment-report',
            data: { claimType: 'REP_SO_PAYMENT_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/sales-payment-report/sales-payment-report.component'
              ).then((m) => m.SalesPaymentReportComponent),
          },
          {
            path: 'sales-purchase-report',
            data: { claimType: 'REP_SALES_VS_PURCHASE_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/sales-purchase-report/sales-purchase-report.component'
              ).then((m) => m.SalesPurchaseReportComponent),
          },
          {
            path: 'expense-report',
            data: { claimType: 'REP_EXPENSE_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./reports/expense-report/expense-report.component').then(
                (m) => m.ExpenseReportComponent
              ),
          },
          {
            path: 'supplier-payment-report',
            data: { claimType: 'REP_SUP_PAYMENT_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/supplier-payments/supplier-payments.component'
              ).then((m) => m.SupplierPaymentsComponent),
          },
          {
            path: 'customer-payment-report',
            data: { claimType: 'REP_CUST_PAYMENT_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/customer-payment-report/customer-payment-report.component'
              ).then((m) => m.CustomerPaymentReportComponent),
          },
          {
            path: 'product-purchase-report',
            data: { claimType: 'REP_PRO_PP_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/product-purchase-report/product-purchase-report.component'
              ).then((m) => m.ProductPurchaseReportComponent),
          },
          {
            path: 'product-sales-report',
            data: { claimType: 'REP_PRO_SO_REPORT' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/product-sales-report/product-sales-report.component'
              ).then((m) => m.ProductSalesReportComponent),
          },
          {
            path: 'stock-report',
            data: { claimType: 'REP_STOCK_REPORT' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./reports/stock-report/stock-report.component').then(
                (m) => m.StockReportComponent
              ),
          },
          {
            path: 'profit-loss-report',
            data: { claimType: 'REP_VIEW_PRO_LOSS_REP' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './reports/profit-loss-report/profit-loss-report.component'
              ).then((m) => m.ProfitLossReportComponent),
          },
          {
            path: 'reports/input-tax-report',
            loadComponent: () => import('./reports/tax-report/input-tax-report/input-tax-report.component').then((m) => m.InputTaxReportComponent),
            data: { claimType: 'REP_VIEW_INPUT_TAX_REP' },
            canActivate: [AuthGuard]
          },
          {
            path: 'reports/out-tax-report',
            loadComponent: () => import('./reports/tax-report/out-tax-report/out-tax-report.component').then((m) => m.OutTaxReportComponent),
            data: { claimType: 'REP_VIEW_OUTPUT_TAX_REP' },
            canActivate: [AuthGuard]
          }, {
            path: 'reports/expense-tax-report',
            loadComponent: () => import('./reports/tax-report/expense-tax-report/expense-tax-report.component').then((m) => m.ExpenseTaxReportComponent),
            data: { claimType: 'REP_VIEW_EXPENSE_TAX_REP' },
            canActivate: [AuthGuard]
          },
          {
            path: 'unitConversation',
            canActivate: [AuthGuard],
            data: { claimType: 'PRO_MANAGE_UNIT' },
            loadComponent: () =>
              import('./unit-conversation/unit-conversation-list/unit-conversation-list.component').then(
                (m) => m.UnitConversationListComponent
              ),
          },
          {
            path: 'languages',
            canLoad: [AuthGuard],
            loadChildren: () =>
              import('./languages/languages.routes').then(
                (m) => m.LANGUAGES_ROUTES
              ),
          }, {
            path: 'stock-transfer',
            loadChildren: () =>
              import('./stock-transfer/stock-transfer-routes').then(
                (m) => m.STOCK_TRANSFER_ROUTES
              ),
          },
          {
            path: 'damaged-stock',
            loadChildren: () =>
              import('./damaged-stock/damaged-stock-routes').then(
                (m) => m.DAMAGED_STOCK_ROUTES
              ),
          },
          {
            path: 'locations',
            data: { claimType: 'SETT_MANAGE_LOCATIONS' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./business-location/business-location-list/business-location-list.component').then(
                (m) => m.BusinessLocationListComponent
              ),
          },
          {
            path: 'page-helper',
            loadChildren: () =>
              import('./page-helper/page-helper-routes').then(
                (c) => c.PAGE_HEPLPER_ROUTES
              ),
          },
          {
            path: 'email-logs',
            loadComponent: () => import('./email-logs/email-logs.component').then((m) => m.EmailLogsComponent),
            data: { claimType: 'LOGS_VIEW_EMAIL_LOGS' },
          },
          {
            path: 'logs',
            loadChildren: () => import('./n-log/n-log-routes').then((m) => m.NLOG_ROUTES),
            data: { claimType: 'LOGS_VIEW_ERROR_LOGS' },
          },
          {
            path: 'table-settings/:screenName',
            canActivate: [TableSettingsGuard],
            loadComponent: () => import('./table-setting/table-setting.component').then((m) => m.TableSettingComponent)
          },
          {
            path: 'accounting',
            loadChildren: () =>
              import('./accounting/accounting-routes').then(
                (m) => m.ACCOUNTING_ROUTES
              ),
          },
          {
            path: 'book-close',
            data: { claimType: 'ACCOUNTING_VIEW_BOOK_CLOSE' },
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./accounting/book-close/book-close').then(
                (m) => m.BookClose
              ),
          },
          {
            path: 'customer-ladger',
            loadChildren: () =>
              import('./customer-ladger/customer-ladger-routing.module').then(
                (m) => m.CustomerLadgerRoutingModule
              ),
          },
          {
            path: 'customer-sales-order',
            canActivate: [AuthGuard],
            loadComponent: () =>
              import(
                './customer-sales-order/customer-sales-order-list/customer-sales-order-list.component'
              ).then((m) => m.CustomerSalesOrderListComponent),
          },
          {
            path: 'pay-roll',
            loadChildren: () =>
              import('./pay-roll/pay-roll-routing.module').then(
                (m) => m.PayRollRoutingModule
              ),
          },
          {
            path: 'calendar-view',
            canActivate: [AuthGuard],
            loadComponent: () =>
              import('./calendar-view/calendar-view').then(
                (m) => m.CalendarView
              )
          },
          {
            path: '**',
            redirectTo: '/',
          },
        ],
      },
    ],
  },
];
