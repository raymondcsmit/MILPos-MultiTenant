import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { SupplierPayment } from '@core/domain-classes/supplier-payment';
import { SupplierPaymentResourceParameter } from '@core/domain-classes/supplier-resource-parameter';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { Observable, Subject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { SupplierPaymentReportDataSource } from './supplier-payment-report.datasource';
import * as XLSX from 'xlsx';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { BaseComponent } from '../../base.component';
import { SupplierService } from '../../supplier/supplier.service';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-supplier-payments',
  templateUrl: './supplier-payments.component.html',
  styleUrls: ['./supplier-payments.component.scss'],
  providers: [CustomCurrencyPipe],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    MatMenuModule,
    TranslateModule,
    MatSelectModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    CustomCurrencyPipe,
    HasClaimDirective,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class SupplierPaymentsComponent extends BaseComponent implements OnInit {
  dataSource!: SupplierPaymentReportDataSource;
  displayedColumns: string[] = ['supplierName', 'totalAmount', 'totalPaidAmount', 'totalPendingAmount'];
  columnsToDisplay: string[] = ["footer"];
  supplierResource: SupplierPaymentResourceParameter;
  loading$!: Observable<boolean>;
  locations: BusinessLocation[] = [];
  supplierPayments: SupplierPayment[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _nameFilter!: string;
  _locationFilter!: string;
  public filterObservable$: Subject<string> = new Subject<string>();

  public get NameFilter(): string {
    return this._nameFilter;
  }

  public set NameFilter(v: string) {
    this._nameFilter = v;
    const nameFilter = `supplierName##${v}`;
    this.filterObservable$.next(nameFilter);
  }

  public set LocationFilter(v: string) {
    this._locationFilter = v;
    const locationIdFilter = `locationId##${v}`;
    this.filterObservable$.next(locationIdFilter);
  }

  public get LocationFilter(): string {
    return this._locationFilter;
  }

  constructor(
    private supplierService: SupplierService,
    private customCurrencyPipe: CustomCurrencyPipe,
    private commonService: CommonService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    super();
    this.getLangDir();
    this.supplierResource = new SupplierPaymentResourceParameter();
    this.supplierResource.pageSize = 10;
    this.supplierResource.orderBy = 'supplierName asc'
  }

  ngOnInit(): void {
    this.dataSource = new SupplierPaymentReportDataSource(this.supplierService);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
      .subscribe((c) => {
        this.supplierResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('##');
        if (strArray[0] === 'supplierName') {
          this.supplierResource.supplierName = escape(strArray[1]);
        } else if (strArray[0] === 'locationId') {
          this.supplierResource.locationId = strArray[1];
        }
        this.dataSource.loadData(this.supplierResource);
      });
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((data: SupplierPayment[]) => {
      this.supplierPayments = data;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.supplierResource.locationId = locationResponse.selectedLocation;
        this.LocationFilter = locationResponse.selectedLocation;
      }
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.supplierResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.supplierResource.pageSize = this.paginator.pageSize;
          this.supplierResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.supplierResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.supplierResource.pageSize = c.pageSize;
          this.supplierResource.skip = c.skip;
          this.supplierResource.totalCount = c.totalCount;
        }
      });
  }

  onDownloadReport(type: string) {
    if (!this.supplierResource || this.supplierResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    this.supplierService.getSupplierPayments(this.supplierResource)
      .subscribe((c: HttpResponse<SupplierPayment[]>) => {
        if (c.body) {
          let customerPayments = [...c.body];
          let heading = [[
            this.translationService.getValue('NAME'),
            this.translationService.getValue('TOTAL_AMOUNT'),
            this.translationService.getValue('TOTAL_PAID_AMOUNT'),
            this.translationService.getValue('TOTAL_PENDING_AMOUNT')
          ]];

          let supplierPaymentsReport: any = [];
          customerPayments.forEach((customerPayment: SupplierPayment) => {
            supplierPaymentsReport.push([
              customerPayment.supplierName,
              this.customCurrencyPipe.transform(customerPayment.totalAmount),
              this.customCurrencyPipe.transform(customerPayment.totalPaidAmount),
              this.customCurrencyPipe.transform(customerPayment.totalPendingAmount < 0 ? 0 : customerPayment.totalPendingAmount)
            ]);
          });

          const title = this.translationService.getValue('SUPPLIER_PAYMENT_REPORT');
          if (type == 'csv' || type == 'xlsx') {
            let workBook = XLSX.utils.book_new();
            XLSX.utils.sheet_add_aoa(workBook, heading);
            let workSheet = XLSX.utils.sheet_add_json(workBook, supplierPaymentsReport, { origin: "A2", skipHeader: true });
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
            const locationName = this.locations.find(x => x.id == this.supplierResource.locationId)?.name;
            let y = 15;
            doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
            y = y + 5;
            autoTable(doc, {
              head: heading,
              body: supplierPaymentsReport,
              startY: y
            });
            if (type === 'pdf') {
              doc.save(`${title}.pdf`);
            } else {
              const base64String = doc.output('datauristring').split(',')[1];
              const dialogRef = this.dialog.open(SendEmailComponent, {
                data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: `${title}` }),
                minWidth: '40vw',
              });
              dialogRef.afterClosed().subscribe(() => {
              });
            }

          }
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.supplierPayments.indexOf(row);
  }
}
