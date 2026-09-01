import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ProductListComponent } from './product-list.component';
import { ProductStore } from '../product-store';
import { ProductService } from '../product.service';
import { BrandService } from '@core/services/brand.service';
import { ProductCategoryService } from '@core/services/product-category.service';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ImportExportService } from '@core/services/import-export.service';
import { Product } from '@core/domain-classes/product';
import { Brand } from '@core/domain-classes/brand';
import { ProductCategory } from '@core/domain-classes/product-category';
import { UnitConversation } from '@core/domain-classes/unit-conversation';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let brandService: jasmine.SpyObj<BrandService>;
  let productCategoryService: jasmine.SpyObj<ProductCategoryService>;
  let unitConversationService: jasmine.SpyObj<UnitConversationService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let importExportService: jasmine.SpyObj<ImportExportService>;

  const products: Product[] = [
    { id: 'p1', name: 'Coke', brandName: 'B1', categoryName: 'C1', unitName: 'U1', purchasePrice: 10, salesPrice: 20, productTaxes: [] } as unknown as Product,
    { id: 'p2', name: 'Pepsi', brandName: 'B2', categoryName: 'C2', unitName: 'U2', purchasePrice: 11, salesPrice: 21, productTaxes: [] } as unknown as Product,
  ];

  function paginated(header: Record<string, number> = {}): HttpResponse<Product[]> {
    return new HttpResponse({
      body: products,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: 25, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(() => {
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProducts', 'deleteProudct']);
    productService.deleteProudct.and.returnValue(of(void 0));
    brandService = jasmine.createSpyObj<BrandService>('BrandService', ['getAll']);
    brandService.getAll.and.returnValue(of([{ id: 'b1', name: 'Brand A' } as Brand]));
    productCategoryService = jasmine.createSpyObj<ProductCategoryService>('ProductCategoryService', ['getAll']);
    productCategoryService.getAll.and.returnValue(of([{ id: 'cat1', name: 'Cat A' } as ProductCategory]));
    unitConversationService = jasmine.createSpyObj<UnitConversationService>('UnitConversationService', ['getAll']);
    unitConversationService.getAll.and.returnValue(of([{ id: 'u1' } as UnitConversation]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);
    importExportService = jasmine.createSpyObj<ImportExportService>('ImportExportService', ['exportData', 'downloadFile']);

    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [ProductListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
        { provide: ProductService, useValue: productService },
        { provide: BrandService, useValue: brandService },
        { provide: ProductCategoryService, useValue: productCategoryService },
        { provide: UnitConversationService, useValue: unitConversationService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: securityService },
        { provide: MatDialog, useValue: dialog },
        { provide: ImportExportService, useValue: importExportService },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load products on init', fakeAsync(() => {
    productService.getProducts.and.returnValue(of(paginated()));
    create();
    tick(400);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(productService.getProducts).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pageSize: 15, skip: 0, orderBy: 'createdDate asc' }));
    expect(component.productStore.products().length).toBe(2);
    expect(component.brands.length).toBe(1);
    expect(component.productCategories.length).toBe(1);
    expect(component.units.length).toBe(1);
    expect(component.allCategories.length).toBe(1);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
  }));

  it('name filter reloads with name and reset skip', fakeAsync(() => {
    productService.getProducts.and.returnValues(of(paginated()), of(paginated()));
    create();
    tick(400);
    component.NameFilter = 'pro';
    tick(700);
    tick(400);
    tick(400);
    const args = productService.getProducts.calls.mostRecent().args[0];
    expect(args.name).toBe('pro');
    expect(args.skip).toBe(0);
  }));

  it('category filter reloads with categoryId', fakeAsync(() => {
    productService.getProducts.and.returnValues(of(paginated()), of(paginated()));
    create();
    tick(400);
    component.CategoryFilter = 'cat1';
    tick(700);
    tick(400);
    tick(400);
    const args = productService.getProducts.calls.mostRecent().args[0];
    expect(args.categoryId).toBe('cat1');
    expect(args.skip).toBe(0);
  }));

  it('delete confirmed removes product', fakeAsync(() => {
    productService.getProducts.and.returnValue(of(paginated()));
    create();
    tick(400);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteProduct(products[0]);
    expect(productService.deleteProudct).toHaveBeenCalledWith('p1');
    tick(400);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  }));

  it('declined delete does not call delete api', fakeAsync(() => {
    productService.getProducts.and.returnValue(of(paginated()));
    create();
    tick(400);
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteProduct(products[0]);
    tick(400);
    expect(productService.deleteProudct).not.toHaveBeenCalled();
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    productService.getProducts.and.returnValues(of(paginated()), of(paginated()));
    create();
    tick(400);
    component.sort.active = 'name';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'name', direction: 'desc' } as any);
    tick(400);
    const args = productService.getProducts.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('name desc');
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page reloads with computed skip', fakeAsync(() => {
    productService.getProducts.and.returnValues(of(paginated()), of(paginated()));
    create();
    tick(400);
    fixture.detectChanges();
    component.paginator.nextPage();
    tick(400);
    const args = productService.getProducts.calls.mostRecent().args[0];
    expect(args.skip).toBe(15);
    expect(args.pageSize).toBe(15);
  }));

  it('openImportDialog opens dialog for products and refreshes on close', fakeAsync(() => {
    productService.getProducts.and.returnValues(of(paginated()), of(paginated()));
    create();
    tick(400);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.openImportDialog();
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { entityType: 'products', entityName: 'Product' } }));
    tick(400);
    expect(productService.getProducts.calls.count()).toBe(2);
  }));

  it('exportData downloads csv and reports success; failure reports error', fakeAsync(() => {
    productService.getProducts.and.returnValue(of(paginated()));
    create();
    tick(400);
    importExportService.exportData.and.returnValue(of(new Blob(['csv'])));
    component.exportData('csv');
    expect(importExportService.exportData).toHaveBeenCalledWith('products', 'csv');
    expect(importExportService.downloadFile).toHaveBeenCalledWith(jasmine.any(Blob), jasmine.stringMatching(/^Products_\d{4}-\d{2}-\d{2}\.csv$/));
    expect(toastrService.success).toHaveBeenCalledWith('Data exported successfully');
    importExportService.exportData.and.returnValue(throwError(() => ({ message: 'boom' })));
    component.exportData('excel');
    expect(toastrService.error).toHaveBeenCalledWith('Export failed: boom');
  }));
});
