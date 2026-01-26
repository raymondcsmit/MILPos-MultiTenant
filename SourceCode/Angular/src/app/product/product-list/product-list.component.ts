import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { Brand } from '@core/domain-classes/brand';
import { Product } from '@core/domain-classes/product';
import { ProductCategory } from '@core/domain-classes/product-category';
import {
  ProductResourceParameter,
} from '@core/domain-classes/product-resource-parameter';
import { Unit } from '@core/domain-classes/unit';
import { BrandService } from '@core/services/brand.service';
import { ProductCategoryService } from '@core/services/product-category.service';
import { environment } from '@environments/environment';
import { merge, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { ProductStore } from '../product-store';
import { Router, RouterModule } from '@angular/router';
import { PageHelpTextComponent } from '@shared/page-help-text/page-help-text.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { HasClaimDirective } from '@shared/has-claim.directive';
import { MatSelectModule } from '@angular/material/select';
import { BaseComponent } from '../../base.component';
import { TableSettingsStore } from '../../table-setting/table-setting-store';
import { MatIconModule } from '@angular/material/icon';
import { CustomCurrencyPipe } from '@shared/pipes/custome-currency.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from '@core/services/toastr.service';
import { MatDialog } from '@angular/material/dialog';
import { ImportExportService } from '@core/services/import-export.service';
import { ImportExportDialogComponent } from '@shared/import-export-dialog/import-export-dialog.component';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: true,
  imports: [
    PageHelpTextComponent,
    TranslateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    FormsModule,
    NgStyle,
    MatMenuModule,
    HasClaimDirective,
    RouterModule,
    MatSelectModule,
    MatButtonModule,
    CustomCurrencyPipe,
    MatCardModule,
    MatIconModule,
    NgClass
  ]
})
export class ProductListComponent extends BaseComponent implements OnInit {
  displayedColumns: string[] = [
    'action',
    'imageUrl',
    'name',
    'brandName',
    'categoryName',
    'unitName',
    'purchasePrice',
    'salesPrice'
  ];
  searchColumns: string[] = [
    'action-search',
    'imageUrl-search',
    'name-search',
    'brandName-search',
    'categoryName-search',
    'unitName-search',
    'purchasePrice-search',
    'salesPrice-search'
  ];
  footerToDisplayed = ['footer'];
  brands: Brand[] = [];
  allCategories: ProductCategory[] = [];
  productCategories: ProductCategory[] = [];
  units: Unit[] = [];
  public productStore = inject(ProductStore);
  tableSettingsStore = inject(TableSettingsStore);
  productResource: ProductResourceParameter = { ...this.productStore.productResourceParameter() };
  product!: Product;
  loading: boolean = this.productStore.isLoading();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  _nameFilter: string = this.productResource.name;
  _brandFilter: string = this.productResource.name;
  _unitFilter: string = this.productResource.name;
  _categoryFilter: string = this.productResource.name;
  public filterObservable$: Subject<string> = new Subject<string>();
  baseUrl = environment.apiUrl;

  get visibleTableKeys(): string[] {
    return this.tableSettingsStore.productsTableSettingsVisible().map(c => c.key);
  }
  get visibleTableKeysSearch(): string[] {
    return this.tableSettingsStore.productsTableSettingsVisible().map(c => c.key + '-search');
  }

  public get NameFilter(): string {
    return this._nameFilter;
  }
  public set NameFilter(v: string) {
    const nameFilter = `name:${v}`;
    if (v !== this._nameFilter) {
      this.filterObservable$.next(nameFilter);
    }
    this._nameFilter = v;
  }

  public set BrandFilter(v: string) {
    const brandFilter = `brandId:${v}`;
    if (v !== this._brandFilter) {
      this.filterObservable$.next(brandFilter);
    }
    this._brandFilter = v ? v : '';
  }
  public get BrandFilter(): string {
    return this._brandFilter;
  }

  public set UnitFilter(v: string) {
    const unitFilter = `unitId:${v}`;
    if (v !== this._unitFilter) {
      this.filterObservable$.next(unitFilter);
    }
    this._unitFilter = v ? v : '';
  }
  public get UnitFilter(): string {
    return this._unitFilter;
  }

  public set CategoryFilter(v: string) {
    const categoryFilter = `categoryId:${v}`;
    if (v !== this._categoryFilter) {
      this._categoryFilter = v ? v : '';
      this.filterObservable$.next(categoryFilter);
    }
  }
  public get CategoryFilter(): string {
    return this._categoryFilter;
  }

  orderByColumn: string = '';
  orderByDirection: SortDirection = 'asc';

  constructor(
    private productCategoryService: ProductCategoryService,
    private brandService: BrandService,
    private unitConversationService: UnitConversationService,
    private commonDialogService: CommonDialogService,
    private router: Router,
    private toastrService: ToastrService,
    private dialog: MatDialog,
    private importExportService: ImportExportService
  ) {
    super();
    this.getLangDir();
  }

  ngOnInit(): void {
    const orderBy = this.productStore.productResourceParameter()?.orderBy?.split(" ");

    if (orderBy?.length) {
      this.orderByColumn = orderBy[0];
      this.orderByDirection = (orderBy[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc');
    }

    this.NameFilter = this.productResource.name;
    this.BrandFilter = this.productResource.brandId ?? '';
    this.UnitFilter = this.productResource.unitId ?? '';
    this.CategoryFilter = this.productResource.categoryId ?? '';
    this.getBrands();
    this.getProductCategories();
    this.getUnits();
    this.sub$.sink = this.filterObservable$
      .pipe(debounceTime(1000),
        distinctUntilChanged()
      )
      .subscribe((c) => {
        this.productResource.skip = 0;
        this.paginator.pageIndex = 0;
        const strArray: Array<string> = c.split(':');
        if (strArray[0] === 'name') {
          this.productResource.name = strArray[1] ?? '';
        }
        if (strArray[0] === 'unitId') {
          this.productResource.unitId = strArray[1] ?? '';
        }
        if (strArray[0] === 'brandId') {
          this.productResource.brandId = strArray[1] ?? '';
        }
        if (strArray[0] === 'categoryId') {
          this.productResource.categoryId = strArray[1] ?? '';
        }
        this.productStore.loadByQuery(this.productResource);
      });

  }

  onTableSettings() {
    this.router.navigate([`/table-settings/Products`]);
  }

  refresh() {
    this.productStore.loadByQuery(this.productResource);
  }

  getProductCategories() {
    this.productCategoryService.getAll(true).subscribe((c) => {
      this.productCategories = [...c];
      this.setDeafLevel();
    });
  }

  setDeafLevel(parent?: ProductCategory, parentId?: string) {
    const children = this.productCategories.filter(
      (c) => c.parentId == parentId
    );
    if (children.length > 0) {
      children.map((c, index) => {
        const object: ProductCategory = Object.assign({}, c, {
          deafLevel: parent ? (parent.deafLevel ?? 0) + 1 : 0,
          index:
            (parent ? (parent.index ?? 0) : 0) + index * Math.pow(0.1, (c.deafLevel ?? 0)),
        });
        this.allCategories.push(object);
        this.setDeafLevel(object, object.id);
      });
    }
    return parent;
  }

  getBrands() {
    this.brandService.getAll().subscribe((b) => (this.brands = b));
  }

  getUnits() {
    this.unitConversationService.getAll().subscribe((units) => {
      this.units = units;
    });
  }

  ngAfterViewInit() {
    this.sub$.sink = this.sort.sortChange.subscribe(
      () => (this.paginator.pageIndex = 0)
    );
    this.sub$.sink = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap((c: any) => {
          this.productResource.skip = this.paginator.pageIndex * this.paginator.pageSize;
          this.productResource.pageSize = this.paginator.pageSize;
          this.productResource.orderBy = this.sort.active + ' ' + this.sort.direction;
          this.productStore.loadByQuery(this.productResource);
        })
      )
      .subscribe();
  }

  deleteProduct(product: Product) {
    this.commonDialogService
      .deleteConformationDialog(
        `${this.translationService.getValue(
          'ARE_YOU_SURE_YOU_WANT_TO_DELETE'
        )}?`
      )
      .subscribe((isTrue: boolean) => {
        if (isTrue) {
          this.productStore.deleteProductById(product.id ?? '');
        }
      });
  }

  isOddDataRow(index: number): boolean {
    // index = the index in dataSource, not in DOM
    return index % 2 !== 0;
  }

  getDataIndex(row: any) {
    return this.productStore.products().indexOf(row);
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportExportDialogComponent, {
      width: '850px',
      data: {
        entityType: 'products',
        entityName: 'Product'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refresh();
      }
    });
  }

  exportData(format: 'csv' | 'excel'): void {
    this.importExportService.exportData('products', format)
      .subscribe({
        next: (blob) => {
          const date = new Date().toISOString().split('T')[0];
          const fileName = `Products_${date}.${format === 'excel' ? 'xlsx' : 'csv'}`;
          this.importExportService.downloadFile(blob, fileName);
          this.toastrService.success('Data exported successfully');
        },
        error: (error) => {
          this.toastrService.error('Export failed: ' + error.message);
        }
      });
  }
}
