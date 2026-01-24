import { Component, input, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryHistoryResourceParameter } from '@core/domain-classes/inventory-history-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { merge, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InventoryHistoryDataSource } from './inventory-history-datasource';
import { InventoryHistory } from '@core/domain-classes/inventory-history';
import { StockTransfer } from '@core/domain-classes/stockTransfer';
import { MatDialog } from '@angular/material/dialog';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { InventorySourcePipe } from '@shared/pipes/inventory-source.pipe';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { BaseComponent } from '../../../base.component';
import { InventoryService } from '../../../inventory/inventory.service';
import { StockTransferService } from '../../../stock-transfer/stock-transfer.service';
import { StockTransferInvoiceComponent } from '../../../stock-transfer/stock-transfer-invoice/stock-transfer-invoice';
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: 'app-inventory-history-report-list',
  templateUrl: './inventory-history-list.component.html',
  styleUrls: ['./inventory-history-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    RouterModule,
    UTCToLocalTime,
    MatSortModule,
    MatPaginatorModule,
    InventorySourcePipe,
    CustomCurrencyPipe,
    MatCardModule
]
})
export class InventoryHistoryListComponent extends BaseComponent implements OnInit {
  dataSource!: InventoryHistoryDataSource;
  displayedColumns: string[] = ['createdDate', 'inventorySource', 'stock', 'pricePerUnit'];
  columnsToDisplay: string[] = ["footer"];
  inventoryHistoryResource: InventoryHistoryResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  inventory = input.required<Inventory>();

  constructor(
    private inventoryService: InventoryService,
    private stockTransferService: StockTransferService,
    private dialog: MatDialog) {
    super();
    this.getLangDir();
    this.inventoryHistoryResource = new InventoryHistoryResourceParameter();
    this.inventoryHistoryResource.pageSize = 10;
    this.inventoryHistoryResource.orderBy = 'createdDate desc';
  }

  ngOnInit(): void {

    this.inventoryHistoryResource.productId = this.inventory().productId ?? '';
    this.inventoryHistoryResource.locationId = this.inventory().locationId;
    this.dataSource = new InventoryHistoryDataSource(this.inventoryService);
    this.dataSource.loadData(this.inventoryHistoryResource);
    this.getResourceParameter();
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.inventoryHistoryResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.inventoryHistoryResource.pageSize = this.paginator.pageSize;
          this.inventoryHistoryResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.inventoryHistoryResource);
        })
      )
      .subscribe();
  }


  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$
      .subscribe((c: ResponseHeader) => {
        if (c) {
          this.inventoryHistoryResource.pageSize = c.pageSize;
          this.inventoryHistoryResource.skip = c.skip;
          this.inventoryHistoryResource.totalCount = c.totalCount;
        }
      });
  }

  viewTransferDetail(history: InventoryHistory) {
    this.stockTransferService
      .getStockTransfer(history.stockTransferId ?? '')
      .subscribe(
        (c: StockTransfer) => {
          this.dialog.open(StockTransferInvoiceComponent, {
            width: '60vw',
            data: Object.assign({}, c),
          });
        });
  }

}
