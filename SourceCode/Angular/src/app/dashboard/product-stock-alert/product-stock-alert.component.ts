import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Product } from '@core/domain-classes/product';
import {
  ProductResourceParameter,
  ProductType,
} from '@core/domain-classes/product-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { Observable, Subject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { ProductStockAlertDataSource } from './product-stock-alert.datasource';
import { DashboardService } from '../dashboard.service';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';
import { ProductStockAlert } from '@core/domain-classes/product-stock-alert';

@Component({
  selector: 'app-product-stock-alert',
  templateUrl: './product-stock-alert.component.html',
  styleUrls: ['./product-stock-alert.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCardModule,
    NgClass
  ]
})
export class ProductStockAlertComponent
  extends BaseComponent
  implements OnInit {
  dataSource!: ProductStockAlertDataSource;
  displayedColumns: string[] = [
    'productName',
    'businessLocation',
    'stock',
  ];
  footerToDisplayed = ['footer'];
  productResource: ProductResourceParameter;
  product!: Product;
  productStockAlerts!: ProductStockAlert[];
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  public filterObservable$: Subject<string> = new Subject<string>();

  constructor(
    private dashboardService: DashboardService,
  ) {
    super();
    this.getLangDir();
    this.productResource = new ProductResourceParameter();
    this.productResource.pageSize = 15;
    this.productResource.orderBy = 'stock desc';
    this.productResource.productType = ProductType.MainProduct;
  }

  ngOnInit(): void {
    this.dataSource = new ProductStockAlertDataSource(this.dashboardService);
    this.dataSource.loadData(this.productResource);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(() => {
        this.productResource.skip = 0;
        this.paginator.pageIndex = 0;
        this.dataSource.loadData(this.productResource);
      });

    this.dataSource.connect().subscribe((products) => {
      this.productStockAlerts = products;
    });
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.productResource.pageSize = c.pageSize;
          this.productResource.skip = c.skip;
          this.productResource.totalCount = c.totalCount;
        }
      }
    );
  }

  ngAfterViewInit() {
    this.sub$.sink = this.sort.sortChange.subscribe(
      () => (this.paginator.pageIndex = 0)
    );
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.productResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.productResource.pageSize = this.paginator.pageSize;
          this.productResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.productResource);
        })
      )
      .subscribe();
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM  
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.productStockAlerts.indexOf(row);
  }
}
