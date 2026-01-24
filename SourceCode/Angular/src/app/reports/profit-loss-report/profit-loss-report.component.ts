import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ProfitLoss } from '@core/domain-classes/profitLoss';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { dateCompare } from '@core/services/date-range';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import * as XLSX from 'xlsx';
import { ProfitLossReportService } from './profit-loss-report.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from "@angular/material/card";
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-profit-loss-report',
  templateUrl: './profit-loss-report.component.html',
  styleUrls: ['./profit-loss-report.component.scss'],
  providers: [UTCToLocalTime, CustomCurrencyPipe],
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatMenuModule,
    ReactiveFormsModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    PageHelpTextComponent,
    TranslateModule,
    CustomCurrencyPipe,
    MatCardModule
  ]
})
export class ProfitLossReportComponent extends BaseComponent implements OnInit {
  saleOrderResource: SalesOrderResourceParameter;
  purchaseOrderResource!: PurchaseOrderResourceParameter;
  saleOrderProfitLoss: ProfitLoss = {
    total: 0,
    totalTax: 0,
    totalDiscount: 0,
    paidPayment: 0,
    totalItem: 0
  };
  purchaseOrderProfitLoss: ProfitLoss = {
    total: 0,
    totalTax: 0,
    totalDiscount: 0,
    paidPayment: 0,
    totalItem: 0
  };
  searchForm!: UntypedFormGroup;
  totalAmount: number = 0;
  locations: BusinessLocation[] = [];

  currentDate: Date = this.CurrentDate;

  constructor(
    private commonService: CommonService,
    private profitLossReportService: ProfitLossReportService,
    private fb: UntypedFormBuilder,
    private customCurrencyPipe: CustomCurrencyPipe,
    private utcToLocalTime: UTCToLocalTime,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.saleOrderResource = new SalesOrderResourceParameter();
    this.saleOrderResource.pageSize = 15;
    this.saleOrderResource.orderBy = 'createdDate asc';
  }

  ngOnInit(): void {
    this.createSearchFormGroup();
    this.saleOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.saleOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.saleOrderResource.locationId = this.searchForm.get('locationId')?.value;
    this.getBusinessLocations();

  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.saleOrderResource.locationId = locationResponse.selectedLocation;
        this.searchForm.get('locationId')?.setValue(this.saleOrderResource.locationId);
        this.getSaleOrderProfiteLoss(this.saleOrderResource);
        this.getPurchaseProfitLoss(this.saleOrderResource);
      }
    });
  }

  createSearchFormGroup() {
    this.searchForm = this.fb.group(
      {
        fromDate: [this.FromDate],
        toDate: [this.ToDate],
        locationId: [''],
      },
      {
        validators: dateCompare(),
      }
    );
    this.saleOrderResource.fromDate = this.FromDate;
    this.saleOrderResource.toDate = this.ToDate;
  }

  onSearch() {
    if (this.searchForm.valid) {
      this.saleOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
      this.saleOrderResource.toDate = this.searchForm.get('toDate')?.value;
      this.saleOrderResource.locationId = this.searchForm.get('locationId')?.value;
      this.getSaleOrderProfiteLoss(this.saleOrderResource);
      this.getPurchaseProfitLoss(this.saleOrderResource);
    } else {
      this.searchForm.markAllAsTouched();
    }
  }

  onClear() {
    this.searchForm.reset();
    this.searchForm.get('locationId')?.setValue(this.locations[0]?.id);
    this.searchForm.get('fromDate')?.setValue(this.FromDate);
    this.searchForm.get('toDate')?.setValue(this.ToDate);
    this.saleOrderResource.fromDate = this.searchForm.get('fromDate')?.value;
    this.saleOrderResource.toDate = this.searchForm.get('toDate')?.value;
    this.saleOrderResource.locationId = this.searchForm.get('locationId')?.value;
    this.getSaleOrderProfiteLoss(this.saleOrderResource);
    this.getPurchaseProfitLoss(this.saleOrderResource);
  }

  getSaleOrderProfiteLoss(saleOrderResource: SalesOrderResourceParameter) {
    this.profitLossReportService
      .getSaleOrderProfitLoss(saleOrderResource)
      .subscribe((resp: ProfitLoss) => {
        if (resp) {
          this.saleOrderProfitLoss = resp;
        }
      });
  }

  getPurchaseProfitLoss(saleOrderResource: SalesOrderResourceParameter) {
    this.profitLossReportService
      .getPurchaseProfitLoss(saleOrderResource)
      .subscribe((resp: ProfitLoss) => {
        if (resp) {
          this.purchaseOrderProfitLoss = resp;
        }
      });
  }

  onDownloadReport(type: string) {
    if (!this.saleOrderResource || (this.saleOrderProfitLoss.total === 0 && this.purchaseOrderProfitLoss.total === 0)) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }
    let heading = [
      [
        this.translationService.getValue('ITEM'),
        this.translationService.getValue('AMOUNT')
      ],
    ];

    let purchaseReport = [];
    purchaseReport.push([this.translationService.getValue('TOTAL_PURCHASE'), this.customCurrencyPipe.transform(
      this.purchaseOrderProfitLoss?.total - this.purchaseOrderProfitLoss?.totalTax + this.purchaseOrderProfitLoss?.totalDiscount
    )]);

    purchaseReport.push([this.translationService.getValue('TOTAL_PURCHASE_TAX'), this.customCurrencyPipe.transform(
      this.purchaseOrderProfitLoss.totalTax
    )]);

    purchaseReport.push([this.translationService.getValue('TOTAL_DISCOUNT_ON_PURCHASE'), this.customCurrencyPipe.transform(
      this.purchaseOrderProfitLoss?.totalDiscount
    )]);

    purchaseReport.push([this.translationService.getValue('PAID_PAYMENT'), this.customCurrencyPipe.transform(
      this.purchaseOrderProfitLoss.paidPayment
    )]);

    purchaseReport.push([this.translationService.getValue('PURCHASE_DUE'), this.customCurrencyPipe.transform(
      this.purchaseOrderProfitLoss?.total - this.purchaseOrderProfitLoss?.paidPayment
    )]);

    purchaseReport.push([this.translationService.getValue('GROSS_TOTAL'), this.customCurrencyPipe.transform(
      this.purchaseOrderProfitLoss?.total
    )]);
    const title = this.translationService.getValue('PURCHASE_PROFIT_&LOSS_REPORT');

    if (type === 'csv' || type === 'xlsx') {
      let workBook = XLSX.utils.book_new();
      XLSX.utils.sheet_add_aoa(workBook, heading);
      let workSheet = XLSX.utils.sheet_add_json(workBook, purchaseReport, {
        origin: 'A2',
        skipHeader: true,
      });
      XLSX.utils.book_append_sheet(workBook, workSheet, title);
      XLSX.writeFile(workBook, `${title}.${type}`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      const pageWidth = doc.internal.pageSize.getWidth();
      const titleWidth = doc.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(title, titleX, 10);
      doc.setFontSize(10);
      const locationName = this.locations.find(x => x.id == this.saleOrderResource.locationId)?.name;
      let y = 15;
      doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
      let dateFilter = '';
      if (this.saleOrderResource.fromDate) {
        dateFilter = `${this.translationService.getValue('FROM')}::${this.utcToLocalTime.transform(this.saleOrderResource.fromDate, 'shortDate')}`;
      }
      if (this.saleOrderResource.toDate) {
        dateFilter = dateFilter + `   ${this.translationService.getValue('TO')}::${this.utcToLocalTime.transform(this.saleOrderResource.toDate, 'shortDate')}`;
      }
      if (dateFilter) {
        y = y + 5;
        doc.text(dateFilter, 14, y);
      }
      y = y + 5;
      autoTable(doc, {
        head: heading,
        body: purchaseReport,
        startY: y
      });
      if (type === 'pdf') {
        doc.save(`${title}.pdf`);
      } else {
        const base64String = doc.output('datauristring').split(',')[1];

        const dialogRef = this.dialog.open(SendEmailComponent, {
          data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title} ${dateFilter}` }),
          minWidth: '40vw',
        });
        dialogRef.afterClosed().subscribe(() => {
        });

      }
    }
  }

  onSaleDownloadReport(type: string) {
    let heading = [
      [
        this.translationService.getValue('ITEM'),
        this.translationService.getValue('AMOUNT')
      ],
    ];

    let salesReport = [
      [this.translationService.getValue('TOTAL_SALES'), this.customCurrencyPipe.transform(
        this.saleOrderProfitLoss?.total -
        this.saleOrderProfitLoss?.totalTax +
        this.saleOrderProfitLoss?.totalDiscount
      )],
      [
        this.translationService.getValue('TOTAL_SALES_TAX'),
        this.customCurrencyPipe.transform(this.saleOrderProfitLoss.totalTax),
      ],
      [
        this.translationService.getValue('TOTAL_DISCOUNT_ON_SALES'),
        this.customCurrencyPipe.transform(this.saleOrderProfitLoss?.totalDiscount),
      ],
      [
        this.translationService.getValue('PAID_PAYMENT'),
        this.customCurrencyPipe.transform(this.saleOrderProfitLoss.paidPayment),
      ],
      [
        this.translationService.getValue('SALES_DUE'),
        this.customCurrencyPipe.transform(this.saleOrderProfitLoss?.total - this.saleOrderProfitLoss?.paidPayment),
      ],
      [
        this.translationService.getValue('GROSS_TOTAL'),
        this.customCurrencyPipe.transform(this.saleOrderProfitLoss?.total),
      ]
    ];

    const title = this.translationService.getValue('SALES_PROFIT_&LOSS_REPORT');
    if (type === 'csv' || type === 'xlsx') {
      let workBook = XLSX.utils.book_new();
      XLSX.utils.sheet_add_aoa(workBook, heading);
      let workSheet = XLSX.utils.sheet_add_json(workBook, salesReport, {
        origin: 'A2',
        skipHeader: true,
      });
      XLSX.utils.book_append_sheet(workBook, workSheet, title);
      XLSX.writeFile(workBook, `${title}.${type}`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      const pageWidth = doc.internal.pageSize.getWidth();
      const titleWidth = doc.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      doc.text(title, titleX, 10);
      doc.setFontSize(10);
      const locationName = this.locations.find(x => x.id == this.saleOrderResource.locationId)?.name;
      let y = 15;
      doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
      let dateFilter = '';
      if (this.saleOrderResource.fromDate) {
        dateFilter = `${this.translationService.getValue('FROM')}::${this.utcToLocalTime.transform(this.saleOrderResource.fromDate, 'shortDate')}`;
      }
      if (this.saleOrderResource.toDate) {
        dateFilter = dateFilter + `   ${this.translationService.getValue('TO')}::${this.utcToLocalTime.transform(this.saleOrderResource.toDate, 'shortDate')}`;
      }
      if (dateFilter) {
        y = y + 5;
        doc.text(dateFilter, 14, y);
      }
      y = y + 5;
      autoTable(doc, {
        head: heading,
        body: salesReport,
        startY: y
      });
      if (type === 'pdf') {
        doc.save(`${title}.pdf`);
      } else {
        const base64String = doc.output('datauristring').split(',')[1];
        const dialogRef = this.dialog.open(SendEmailComponent, {
          data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title} ${dateFilter}` }),
          minWidth: '40vw',
        });
        dialogRef.afterClosed().subscribe(() => {
        });

      }
    }

  }
}
