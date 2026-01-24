import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { DamagedStock } from '@core/domain-classes/damaged-stock';
import { DamagedStockDataSource } from './damaged-stock-datasource';
import { debounceTime, distinctUntilChanged, merge, Subject, tap } from 'rxjs';
import { DamagedStockResourceParameter } from '@core/domain-classes/damaged-stock-resource-parameter';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { CommonService } from '@core/services/common.service';
import { DamagedStore } from '../damaged-store';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from '../../base.component';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { UTCToLocalTime } from '@shared/pipes/utc-to-local-time.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-damaged-stock-list',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    PageHelpTextComponent,
    TranslateModule,
    MatDatepickerModule,
    RouterModule,
    MatSelectModule,
    FormsModule,
    UTCToLocalTime,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    NgClass
  ],
  templateUrl: './damaged-stock-list.component.html',
  styleUrl: './damaged-stock-list.component.scss',
})
export class DamagedStockListComponent extends BaseComponent implements OnInit {
  damagedStock: DamagedStock[] = [];
  dataSource!: DamagedStockDataSource;
  displayedColumns: string[] = [
    'damagedDate',
    'product',
    'location',
    'damagedQuantity',
    'reason',
    'reportedBy',
  ];
  searchColumns: string[] = [
    'damagedDate-search',
    'product-search',
    'location-search',
    'damagedQuantity-search',
    'reason-search',
    'reportedBy-search',
  ];
  footerToDisplayed = ['footer'];
  locations: BusinessLocation[] = [];
  damagedStore = inject(DamagedStore);
  damagedStockResource: DamagedStockResourceParameter = { ...this.damagedStore.damagedStockResourceParameter() };
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _damagedDateFilter: Date | undefined | null = this.damagedStockResource.damagedDate;
  _locationFilter: string | undefined = this.damagedStockResource.locationId;
  _productFilter: string | undefined = this.damagedStockResource.productId;
  public filterObservable$: Subject<string> = new Subject<string>();

  public get DamagedDateFilter(): string {
    return this._damagedDateFilter ? this._damagedDateFilter.toISOString() : '';
  }

  public set DamagedDateFilter(v: string) {
    this._damagedDateFilter = new Date(v);
    const referenceNoFilterFilter = `damagedDate:${v}`;
    this.filterObservable$.next(referenceNoFilterFilter);
  }

  public set LocationFilter(v: string) {
    this._locationFilter = v ? v : '';
    const locationFilter = `locationId:${this._locationFilter}`;
    this.filterObservable$.next(locationFilter);
  }
  public get LocationFilter(): string {
    return this._locationFilter ?? '';
  }

  public set ProductFilter(v: string) {
    this._productFilter = v ? v : '';
    const toFilter = `productId:${this._productFilter}`;
    this.filterObservable$.next(toFilter);
  }
  public get ProductFilter(): string {
    return this._productFilter ?? '';
  }
  constructor(
    private commonService: CommonService,
  ) {
    super();
    this.getLangDir();
    this.getBusinessLocations();
  }

  ngOnInit(): void {
    if (this.damagedStockResource.damagedDate) {
      this.DamagedDateFilter = this.damagedStockResource.damagedDate.toISOString();
    }
    this.LocationFilter = this.damagedStockResource.locationId ?? '';
    this.ProductFilter = this.damagedStockResource.productId ?? '';
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.damagedStockResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'damagedDate') {
          this.damagedStockResource.damagedDate = new Date(strArray[1]);
        }
        if (strArray[0] === 'locationId') {
          this.damagedStockResource.locationId = strArray[1];
        }
        if (strArray[0] === 'productId') {
          this.damagedStockResource.productId = strArray[1];
        }
        this.damagedStore.loadByQuery(this.damagedStockResource);
      });
  }

  refresh() {
    this.damagedStore.loadByQuery(this.damagedStockResource);
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(
      () => (this.paginator.pageIndex = 0)
    );
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.damagedStockResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.damagedStockResource.pageSize = this.paginator.pageSize;
          this.damagedStockResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.damagedStore.loadByQuery(this.damagedStockResource);
        })
      )
      .subscribe();
  }


  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.damagedStore.damagedStocks().indexOf(row);
  }
}
