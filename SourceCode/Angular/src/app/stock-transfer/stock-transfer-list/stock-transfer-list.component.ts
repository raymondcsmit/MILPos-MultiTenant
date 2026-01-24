import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { ToastrService } from '@core/services/toastr.service';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { StockTransferDataSource } from './stock-transfer-datasource';
import { StockTransferService } from '../stock-transfer.service';
import { StockTransferResourceParameter } from '@core/domain-classes/stockTransfer-resource-parameter';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { Router, RouterModule } from '@angular/router';
import { StockTransferInvoiceComponent } from '../stock-transfer-invoice/stock-transfer-invoice';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { SalesDeliveryStatusPipe } from '@shared/pipes/sales-delivery-status.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { BaseComponent } from '../../base.component';
import { NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-stock-transfer-list',
  templateUrl: './stock-transfer-list.component.html',
  styleUrls: ['./stock-transfer-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    RouterModule,
    MatSelectModule,
    MatPaginatorModule,
    FormsModule,
    SalesDeliveryStatusPipe,
    CustomCurrencyPipe,
    UTCToLocalTime,
    NgClass,
    MatCardModule,
  ]
})
export class StockTransferListComponent
  extends BaseComponent
  implements OnInit {
  dataSource!: StockTransferDataSource;
  displayedColumns: string[] = [
    'action',
    'transferDate',
    'referenceNo',
    'fromLocationName',
    'toLocationName',
    'totalShippingCharge',
    'totalAmount',
    'status',
  ];
  searchColumns: string[] = [
    'action-search',
    'transferDate-search',
    'referenceNo-search',
    'fromLocation-search',
    'toLocation-search',
    'totalAmount-search',
    'totalShippingCharge-search',
    'status-search',
  ];
  footerToDisplayed = ['footer'];
  locations: BusinessLocation[] = [];
  stockTransferResource: StockTransferResourceParameter;
  stockTransfer!: StockTransfer;
  stockTransfers: StockTransfer[] = [];
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _referenceNoFilter!: string;
  _fromFilter!: string;
  _toFilter!: string;
  public filterObservable$: Subject<string> = new Subject<string>();

  public get ReferenceNoFilterFilter(): string {
    return this._referenceNoFilter;
  }

  public set ReferenceNoFilterFilter(v: string) {
    this._referenceNoFilter = v;
    const referenceNoFilterFilter = `referenceNo:${v}`;
    this.filterObservable$.next(referenceNoFilterFilter);
  }

  public set FromFilter(v: string) {
    this._fromFilter = v ? v : '';
    const fromFilter = `fromLocationId:${this._fromFilter}`;
    this.filterObservable$.next(fromFilter);
  }
  public get FromFilter(): string {
    return this._fromFilter;
  }

  public set ToFilter(v: string) {
    this._toFilter = v ? v : '';
    const toFilter = `toLocationId:${this._toFilter}`;
    this.filterObservable$.next(toFilter);
  }
  public get ToFilter(): string {
    return this._toFilter;
  }

  constructor(
    private stockTransferService: StockTransferService,
    private commonDialogService: CommonDialogService,
    private toastrService: ToastrService,
    private commonService: CommonService,
    private router: Router,
    private dialog: MatDialog
  ) {
    super();
    this.getLangDir();
    this.getBusinessLocations();
    this.stockTransferResource = new StockTransferResourceParameter();
    this.stockTransferResource.pageSize = 15;
    this.stockTransferResource.orderBy = 'createdDate desc';
  }

  ngOnInit(): void {
    this.dataSource = new StockTransferDataSource(this.stockTransferService);
    this.dataSource.loadData(this.stockTransferResource);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.stockTransferResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'referenceNo') {
          this.stockTransferResource.referenceNo = strArray[1];
        }
        if (strArray[0] === 'fromLocationId') {
          this.stockTransferResource.fromLocationId = strArray[1];
        }
        if (strArray[0] === 'toLocationId') {
          this.stockTransferResource.toLocationId = strArray[1];
        }
        this.dataSource.loadData(this.stockTransferResource);
      });

    this.dataSource.connect().subscribe((data: StockTransfer[]) => {
      this.stockTransfers = data;
    });
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.stockTransferResource.pageSize = c.pageSize;
          this.stockTransferResource.skip = c.skip;
          this.stockTransferResource.totalCount = c.totalCount;
        }
      }
    );
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  ngAfterViewInit() {
    this.sub$.sink = this.sort.sortChange.subscribe(
      () => (this.paginator.pageIndex = 0)
    );
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.stockTransferResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.stockTransferResource.pageSize = this.paginator.pageSize;
          this.stockTransferResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.stockTransferResource);
        })
      )
      .subscribe();
  }

  deleteStockTransfer(stockTransfer: StockTransfer) {
    this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )}?`
      )
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.sub$.sink = this.stockTransferService
            .deleteStockTransfer(stockTransfer.id ?? '')
            .subscribe(() => {
              this.toastrService.success(
                this.translationService.getValue(
                  'STOCK_TRANSFER_DELETED_SUCCESSFULLY'
                )
              );
              this.paginator.pageIndex = 0;
              this.dataSource.loadData(this.stockTransferResource);
            });
        }
      });
  }

  viewInvoice(stockTransfer: any) {
    this.stockTransferService.getStockTransfer(stockTransfer.id).subscribe(
      (c: StockTransfer) => {
        const dialogRef = this.dialog.open(StockTransferInvoiceComponent, {
          maxWidth: '50vw',
          width: '100%',
          data: Object.assign({}, c),
        });
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.stockTransfers.indexOf(row);
  }
}
