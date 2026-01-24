import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CustomerResourceParameter } from '@core/domain-classes/customer-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { Observable, Subject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { CustomerPaymentReportDataSource } from './customer-payment-report.datasource';
import * as XLSX from 'xlsx';
import { CustomerPayment } from '@core/domain-classes/customer-payment';
import { HttpResponse } from '@angular/common/http';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
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
import { CustomerService } from '../../customer/customer.service';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from '@core/services/toastr.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-customer-payment-report',
  templateUrl: './customer-payment-report.component.html',
  styleUrls: ['./customer-payment-report.component.scss'],
  providers: [UTCToLocalTime, CustomCurrencyPipe],
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
    HasClaimDirective,
    CustomCurrencyPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NgClass
  ]
})
export class CustomerPaymentReportComponent extends BaseComponent implements OnInit {
  dataSource!: CustomerPaymentReportDataSource;
  locations: BusinessLocation[] = [];
  customerPayments: CustomerPayment[] = [];
  displayedColumns: string[] = ['customerName', 'totalAmount', 'totalPaidAmount', 'totalPendingAmount'];
  columnsToDisplay: string[] = ["footer"];
  customerResource: CustomerResourceParameter;
  loading$!: Observable<boolean>;
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
    const nameFilter = `customerName##${v}`;
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
    private customerService: CustomerService,
    private commonService: CommonService,
    private customCurrencyPipe: CustomCurrencyPipe,
    private toastr: ToastrService,
    private dialog: MatDialog) {
    super();
    this.getLangDir();
    this.customerResource = new CustomerResourceParameter();
    this.customerResource.pageSize = 10;
    this.customerResource.orderBy = 'customerName asc';
  }

  ngOnInit(): void {
    this.dataSource = new CustomerPaymentReportDataSource(this.customerService);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(
        debounceTime(1000),
        distinctUntilChanged())
      .subscribe((c) => {
        this.customerResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('##');
        if (strArray[0] === 'customerName') {
          this.customerResource.customerName = escape(strArray[1]);
        } else if (strArray[0] === 'locationId') {
          this.customerResource.locationId = strArray[1];
        }
        this.dataSource.loadData(this.customerResource);
      });
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((data: CustomerPayment[]) => {
      this.customerPayments = data;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.customerResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.customerResource.pageSize = this.paginator.pageSize;
          this.customerResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.customerResource);
        })
      )
      .subscribe();
  }

  getBusinessLocations() {
    this.commonService.getLocationsForReport().subscribe((locationResposne) => {
      this.locations = locationResposne.locations;
      if (this.locations?.length > 0) {
        this.customerResource.locationId = locationResposne.selectedLocation;
        this.LocationFilter = locationResposne.selectedLocation;
      }
    });
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader | null) => {
        if (c) {
          this.customerResource.pageSize = c.pageSize;
          this.customerResource.skip = c.skip;
          this.customerResource.totalCount = c.totalCount;
        }
      });
  }

  onDownloadReport(type: string) {
    if (!this.customerResource || this.customerResource.totalCount === 0) {
      this.toastr.error(this.translationService.getValue('NO_DATA_FOUND'));
      return;
    }

    this.customerResource.pageSize = 0;
    this.customerService.getCustomerPayments(this.customerResource)
      .subscribe((c: HttpResponse<CustomerPayment[]>) => {
        this.customerResource.pageSize = 10;
        let customerPayments = [...c.body ?? []];
        let heading = [[
          this.translationService.getValue('NAME'),
          this.translationService.getValue('TOTAL_AMOUNT'),
          this.translationService.getValue('TOTAL_PAID_AMOUNT'),
          this.translationService.getValue('TOTAL_PENDING_AMOUNT')
        ]];

        let customerPaymentsReport: any = [];
        customerPayments.forEach((customerPayment: CustomerPayment) => {
          customerPaymentsReport.push([
            customerPayment.customerName,
            this.customCurrencyPipe.transform(customerPayment.totalAmount),
            this.customCurrencyPipe.transform(customerPayment.totalPaidAmount),
            this.customCurrencyPipe.transform(customerPayment.totalPendingAmount < 0 ? 0 : customerPayment.totalPendingAmount)
          ]);
        });
        const title = this.translationService.getValue('CUSTOMER_PAYMENT_REPORT');
        if (type === 'csv' || type === 'xlsx') {
          let workBook = XLSX.utils.book_new();
          XLSX.utils.sheet_add_aoa(workBook, heading);
          let workSheet = XLSX.utils.sheet_add_json(workBook, customerPaymentsReport, { origin: "A2", skipHeader: true });
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
          const locationName = this.locations.find(x => x.id == this.customerResource.locationId)?.name;
          let y = 15;
          doc.text(`${this.translationService.getValue('BUSINESS_LOCATION')}::${locationName}`, 14, y);
          y = y + 5;
          autoTable(doc, {
            head: heading,
            body: customerPaymentsReport,
            startY: y
          });
          if (type === 'pdf') {
            doc.save(`${title}.pdf`);
          } else {
            const base64String = doc.output('datauristring').split(',')[1];
            const dialogRef = this.dialog.open(SendEmailComponent, {
              data: Object.assign({}, { blob: base64String, name: `${title}.pdf`, contentType: 'application/pdf', subject: title }),
              minWidth: '40vw',
            });
            dialogRef.afterClosed().subscribe(() => {
            });
          }
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.customerPayments.indexOf(row);
  }
}
