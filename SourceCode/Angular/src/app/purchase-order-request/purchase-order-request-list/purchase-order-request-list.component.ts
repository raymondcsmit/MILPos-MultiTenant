import { ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { Supplier } from '@core/domain-classes/supplier';
import { merge, Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';
import { SendEmailComponent } from '@shared/send-email/send-email.component';
import { MatDialog } from '@angular/material/dialog';
import { PurchaseOrderRequestStore } from '../purchase-order-request-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PurchaseOrderRequestItemsComponent } from './purchase-order-request-items/purchase-order-request-items.component';
import { PurchaseOrderInvoiceComponent } from '@shared/purchase-order-invoice/purchase-order-invoice.component';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BaseComponent } from '../../base.component';
import { PurchaseOrderService } from '../../purchase-order/purchase-order.service';
import { SupplierService } from '../../supplier/supplier.service';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { AsyncPipe, NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from '@core/services/toastr.service';

@Component({
  selector: 'app-purchase-order-request-list',
  templateUrl: './purchase-order-request-list.component.html',
  styleUrls: ['./purchase-order-request-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    HasClaimDirective,
    RouterModule,
    MatAutocompleteModule,
    PurchaseOrderRequestItemsComponent,
    PurchaseOrderInvoiceComponent,
    FormsModule,
    UTCToLocalTime,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    CustomCurrencyPipe,
    ReactiveFormsModule,
    AsyncPipe,
    MatCardModule,
    NgClass
  ]
})
export class PurchaseOrderRequestListComponent extends BaseComponent {
  displayedColumns: string[] = [
    'action',
    'poCreatedDate',
    'orderNumber',
    'businessLocation',
    'supplierName',
    'totalAmount',
    'totalDiscount',
    'totalTax',
    'deliveryDate',
    'createdByName'
  ];
  filterColumns: string[] = [
    'action-search',
    'poCreatedDate-search',
    'orderNumber-search',
    'businessLocation-search',
    'supplier-search',
    'totalAmount-search',
    'totalDiscount-search',
    'totalTax-search',
    'deliverDate-search',
    'createdByName-search'
  ];
  footerToDisplayed: string[] = ['footer'];
  purchaseOrderRequestStore = inject(PurchaseOrderRequestStore);
  purchaseOrderResource: PurchaseOrderResourceParameter = { ...this.purchaseOrderRequestStore.purchaseOrderResourceParameter() };
  isLoading: boolean = false;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _supplierFilter: string = this.purchaseOrderResource.supplierName ?? '';
  _orderNumberFilter: string = this.purchaseOrderResource.orderNumber ?? '';
  supplierNameControl: any = new FormControl<string>({ value: this.purchaseOrderResource.supplierName ?? '', disabled: false });
  supplierList$!: Observable<Supplier[]>;
  expandedElement!: PurchaseOrder | null;
  public filterObservable$: Subject<string> = new Subject<string>();
  isSendEmail: boolean = false;
  purchaseOrderForInvoice!: PurchaseOrder | null;
  public get SupplierFilter(): string {
    return this._supplierFilter;
  }

  public set SupplierFilter(v: string) {
    if (this._supplierFilter !== v) {
      this._supplierFilter = v;
      const supplierFilter = `supplierName:${v}`;
      this.filterObservable$.next(supplierFilter);
    }
  }

  public get OrderNumberFilter(): string {
    return this._orderNumberFilter;
  }

  public set OrderNumberFilter(v: string) {
    if (this._orderNumberFilter !== v) {
      this._orderNumberFilter = v;
      const orderNumberFilter = `orderNumber:${v}`;
      this.filterObservable$.next(orderNumberFilter);
    }
  }
  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private supplierService: SupplierService,
    private cd: ChangeDetectorRef,
    private commonDialogService: CommonDialogService,
    private router: Router,
    private dialog: MatDialog,
    private toastrService: ToastrService
  ) {
    super();
    this.getLangDir();
  }


  ngOnInit(): void {

    const orderBy = this.purchaseOrderRequestStore.purchaseOrderResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }
    this.SupplierFilter = this.purchaseOrderResource.supplierName ?? '';
    this.OrderNumberFilter = this.purchaseOrderResource.orderNumber ?? '';
    this.supplierNameControlOnChange();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.purchaseOrderResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'supplierName') {
          this.purchaseOrderResource.supplierName = strArray[1];
        } else if (strArray[0] === 'orderNumber') {
          this.purchaseOrderResource.orderNumber = strArray[1];
        }
        this.purchaseOrderRequestStore.loadByQuery(this.purchaseOrderResource);
      });
  }
  refresh() {
    this.purchaseOrderRequestStore.loadByQuery(this.purchaseOrderResource);
  }

  convertToPurchaseOrder(purchaseOrder: PurchaseOrder) {
    this.router.navigate(['purchase-order/add'], {
      queryParams: { 'purchase-order-requestId': purchaseOrder.id },
    });
  }

  onDetailPurchaseOrder(purchaseOrder: PurchaseOrder) {
    this.router.navigate(['/purchase-order-request', purchaseOrder.id]);
  }

  supplierNameControlOnChange() {
    this.supplierList$ = this.supplierNameControl.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      switchMap((c: string) => {
        return this.supplierService.getSuppliersForDropDown(c);
      })
    );
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.purchaseOrderResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.purchaseOrderResource.pageSize = this.paginator.pageSize;
          this.purchaseOrderResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.purchaseOrderRequestStore.loadByQuery(this.purchaseOrderResource);
        })
      )
      .subscribe();
  }

  toggleRow(element: PurchaseOrder) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  poChangeEvent(purchaseOrder: PurchaseOrder) {
    this.toggleRow(purchaseOrder);
  }

  deletePurchaseOrder(purchaseOrder: PurchaseOrder) {
    this.commonDialogService
      .deleteConformationDialog(
        this.translationService.getValue('ARE_YOU_SURE_YOU_WANT_TO_DELETE')
      )
      .subscribe((isYes) => {
        if (isYes) {
          this.purchaseOrderRequestStore.deletePurchaseOrderById(purchaseOrder.id ?? '');
        }
      });
  }

  generateInvoice(po: PurchaseOrder) {
    this.purchaseOrderForInvoice = null;
    this.isSendEmail = false;
    this.getPurchaseOrderById(po.id ?? '');
  }
  sendEmail(po: PurchaseOrder) {
    this.purchaseOrderForInvoice = null;
    this.isSendEmail = true;
    this.getPurchaseOrderById(po.id ?? '');
  }
  getPurchaseOrderById(id: string) {
    this.purchaseOrderService
      .getPurchaseOrderById(id)
      .subscribe((purchaserOrder: PurchaseOrder) => {
        this.purchaseOrderForInvoice = purchaserOrder;
      });
  }
  onEmailBlob(event: string) {
    const dialogRef = this.dialog.open(SendEmailComponent, {
      data: Object.assign({}, { blob: event, name: `${this.purchaseOrderForInvoice?.orderNumber}.pdf`, contentType: 'application/pdf', subject: `${this.purchaseOrderForInvoice?.orderNumber}::${this.translationService.getValue('PURCHASE_ORDERS_REQUEST')}` }),
      minWidth: '40vw',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.purchaseOrderForInvoice = null;
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrderRequestStore.purchaseOrders().indexOf(row);
  }
}
