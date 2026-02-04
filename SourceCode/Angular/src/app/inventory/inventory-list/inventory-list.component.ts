import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Inventory } from '@core/domain-classes/inventory';
import { InventoryResourceParameter } from '@core/domain-classes/inventory-resource-parameter';
import { ResponseHeader } from '@core/domain-classes/response-header';
import { merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { InventoryService } from '../inventory.service';
import { ManageInventoryComponent } from '../manage-inventory/manage-inventory.component';
import { InventoryDataSource } from './inventory-datasource';
import { CommonService } from '@core/services/common.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { BaseComponent } from '../../base.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    HasClaimDirective,
    MatSelectModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    NgClass
  ]
})
export class InventoryListComponent extends BaseComponent implements OnInit {
  dataSource!: InventoryDataSource;
  displayedColumns: string[] = [
    'action',
    'productName',
    'stock',
    'unit',
  ];
  columnsToDisplay: string[] = ['footer'];
  inventoryResource: InventoryResourceParameter;
  loading$!: Observable<boolean>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _productNameFilter!: string;
  expandedElement: Inventory | null = null;
  locations: BusinessLocation[] = [];
  _locationFilter!: string;
  inventorys : Inventory[] = [];

  public filterObservable$: Subject<string> = new Subject<string>();

  public get ProductNameFilter(): string {
    return this._productNameFilter;
  }

  public set ProductNameFilter(v: string) {
    this._productNameFilter = v;
    const nameFilter = `productName##${v}`;
    this.filterObservable$.next(nameFilter);
  }

  public get LocationFilter(): string {
    return this._locationFilter;
  }

  public set LocationFilter(v: string) {
    this._locationFilter = v;
    const locationfilter = `location##${v}`;
    this.filterObservable$.next(locationfilter);
  }

  constructor(
    private inventoryService: InventoryService,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog,
    private commonService: CommonService,
    private router: Router
  ) {
    super();
    this.getLangDir();
    this.inventoryResource = new InventoryResourceParameter();
    this.inventoryResource.pageSize = 50;
    this.inventoryResource.orderBy = 'productName asc';
  }

  ngOnInit(): void {
    this.dataSource = new InventoryDataSource(this.inventoryService);
    this.getResourceParameter();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe((c) => {
        this.inventoryResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split('##');
        if (strArray[0] === 'productName') {
          this.inventoryResource.productName = escape(strArray[1]);
        }
        if (strArray[0] === 'location') {
          this.inventoryResource.locationId = strArray[1];
        }
        this.dataSource.loadData(this.inventoryResource);
      });
    this.getBusinessLocations();

    this.dataSource.connect().subscribe((d) => {
      this.inventorys = d;
    });
  }

  getBusinessLocations() {
    this.commonService.getLocationsForCurrentUser().subscribe((locationResponse) => {
      this.locations = locationResponse.locations;
      if (this.locations?.length > 0) {
        this.LocationFilter = locationResponse.selectedLocation
      }
    });
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => {
          this.inventoryResource.skip =
            this.paginator.pageIndex * this.paginator.pageSize;
          this.inventoryResource.pageSize = this.paginator.pageSize;
          this.inventoryResource.orderBy =
            this.sort.active + ' ' + this.sort.direction;
          this.dataSource.loadData(this.inventoryResource);
        })
      )
      .subscribe();
  }

  getResourceParameter() {
    this.sub$.sink = this.dataSource.responseHeaderSubject$.subscribe(
      (c: ResponseHeader) => {
        if (c) {
          this.inventoryResource.pageSize = c.pageSize;
          this.inventoryResource.skip = c.skip;
          this.inventoryResource.totalCount = c.totalCount;
        }
      }
    );
  }

  toggleRow(element: Inventory) {
    this.expandedElement = this.expandedElement === element ? null : element;
    this.cd.detectChanges();
  }

  navigateToBulkUpdate() {
    this.router.navigate(['/inventory/bulk-update']);
  }

  addInvenotry(inventory?: Inventory | null) {
    const dialogRef = this.dialog.open(ManageInventoryComponent, {
      maxHeight: '90vh',
      maxWidth: '40vw',
      width: '100%',
      direction: this.langDir,
      data: { inventory: Object.assign({}, inventory), locations: this.locations, selectedLocation: this.LocationFilter },
    });
    dialogRef.afterClosed().subscribe((data: boolean) => {
      if (data) {
        this.dataSource.loadData(this.inventoryResource);
      }
    });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.inventorys.indexOf(row);
  }
}
