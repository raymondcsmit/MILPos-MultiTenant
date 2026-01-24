import { Component, input, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { PurchaseOrder } from '@core/domain-classes/purchase-order';
import { PurchaseOrderResourceParameter } from '@core/domain-classes/purchase-order-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { merge, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BaseComponent } from '../../../base.component';
import { PurchaseOrderDataSource } from '../../../purchase-order/purchase-order-list/purchase-order-datasource';
import { PurchaseOrderService } from '../../../purchase-order/purchase-order.service';
import { NgClass } from '@angular/common';
import { MatCardModule } from "@angular/material/card";
import { PageHelpTextComponent } from "@shared/page-help-text/page-help-text.component";

@Component({
  selector: 'app-supplier-po-list',
  templateUrl: './supplier-po-list.component.html',
  styleUrls: ['./supplier-po-list.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    UTCToLocalTime,
    PaymentStatusPipe,
    CustomCurrencyPipe,
    RouterModule,
    NgClass,
    MatCardModule,
    PageHelpTextComponent
  ]
})
export class SupplierPOListComponent extends BaseComponent implements OnChanges {
  supplierId = input.required<string>();
  dataSource!: PurchaseOrderDataSource;
  purchaseOrders: PurchaseOrder[] = [];
  displayedColumns: string[] = ['poCreatedDate', 'orderNumber', 'totalDiscount', 'totalTax', 'totalAmount', 'paymentStatus'];
  footerToDisplayed: string[] = ['footer'];
  purchaseOrderResource!: PurchaseOrderResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  constructor(
    private purchaseOrderService: PurchaseOrderService) {
    super();
    this.getLangDir();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['supplierId']) {
      this.getPurchaseOrder();
    }
  }

  getPurchaseOrder(): void {
    this.purchaseOrderResource = new PurchaseOrderResourceParameter();
    this.purchaseOrderResource.pageSize = 5;
    this.purchaseOrderResource.orderBy = 'poCreatedDate asc'
    this.purchaseOrderResource.supplierId = this.supplierId();
    this.dataSource = new PurchaseOrderDataSource(this.purchaseOrderService);
    this.dataSource.loadData(this.purchaseOrderResource);
    this.getResourceParameter();

    this.dataSource.connect().subscribe((data: PurchaseOrder[]) => {
      this.purchaseOrders = data;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.purchaseOrderResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.purchaseOrderResource.pageSize = this.paginator.pageSize;
          this.purchaseOrderResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.purchaseOrderResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.purchaseOrderResource.pageSize = c.pageSize;
          this.purchaseOrderResource.skip = c.skip;
          this.purchaseOrderResource.totalCount = c.totalCount;
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.purchaseOrders.indexOf(row);
  }
}
