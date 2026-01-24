import { CommonModule } from '@angular/common';
import { Component, input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { SalesOrder } from '@core/domain-classes/sales-order';
import { SalesOrderResourceParameter } from '@core/domain-classes/sales-order-resource-parameter';
import { TranslateModule } from '@ngx-translate/core';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { PaymentStatusPipe } from '@shared/pipes/payment-status.pipe';
import { merge, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BaseComponent } from '../../../base.component';
import { SalesOrderDataSource } from '../../../sales-order/sales-order-datasource';
import { SalesOrderService } from '../../../sales-order/sales-order.service';
import { RouterModule } from '@angular/router';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatCardModule } from "@angular/material/card";
import { PageHelpTextComponent } from "@shared/page-help-text/page-help-text.component";

@Component({
  selector: 'app-customer-so-list',
  templateUrl: './customer-so-list.component.html',
  styleUrls: ['./customer-so-list.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    MatTableModule,
    PaymentStatusPipe,
    CustomCurrencyPipe,
    MatPaginatorModule,
    RouterModule,
    UTCToLocalTime,
    MatSortModule,
    MatCardModule,
    PageHelpTextComponent
]
})
export class CustomerSoListComponent extends BaseComponent implements OnChanges {
  customerId = input.required<string>();
  dataSource!: SalesOrderDataSource;
  saleOrders: SalesOrder[] = [];
  displayedColumns: string[] = ['soCreatedDate', 'orderNumber', 'totalDiscount', 'totalTax', 'totalAmount', 'paymentStatus'];
  footerToDisplayed: string[] = ['footer'];
  salesOrderResource!: SalesOrderResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  constructor(
    private salesOrderService: SalesOrderService) {
    super();
    this.getLangDir();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId']) {
      this.getSalesOrder();
    }
  }

  getSalesOrder(): void {
    this.salesOrderResource = new SalesOrderResourceParameter();
    this.salesOrderResource.pageSize = 5;
    this.salesOrderResource.orderBy = 'soCreatedDate asc'
    this.salesOrderResource.customerId = this.customerId();
    this.dataSource = new SalesOrderDataSource(this.salesOrderService);
    this.dataSource.loadData(this.salesOrderResource);
    this.getResourceParameter();
    
    // Subscribe to data changes to keep saleOrders array updated
    this.sub$.sink = this.dataSource.connect().subscribe((data: SalesOrder[]) => {
      this.saleOrders = data;
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.salesOrderResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.salesOrderResource.pageSize = this.paginator.pageSize;
          this.salesOrderResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.salesOrderResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.salesOrderResource.pageSize = c.pageSize;
          this.salesOrderResource.skip = c.skip;
          this.salesOrderResource.totalCount = c.totalCount;
        }
      });
  }

   isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.saleOrders.indexOf(row);
  }
}
