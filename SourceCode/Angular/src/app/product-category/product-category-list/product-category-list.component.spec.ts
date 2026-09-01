import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ProductCategoryListComponent } from './product-category-list.component';
import { ProductCategoryService } from '@core/services/product-category.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ProductCategory } from '@core/domain-classes/product-category';

describe('ProductCategoryListComponent', () => {
  let component: ProductCategoryListComponent;
  let fixture: ComponentFixture<ProductCategoryListComponent>;
  let productCategoryService: jasmine.SpyObj<ProductCategoryService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const categories: ProductCategory[] = [
    { id: 'pc1', name: 'Dairy', description: 'Milk' } as ProductCategory,
    { id: 'pc2', name: 'Bakery', description: 'Bread' } as ProductCategory,
  ];

  beforeEach(() => {
    productCategoryService = jasmine.createSpyObj<ProductCategoryService>('ProductCategoryService', ['getAll', 'getAllSubCategories', 'delete']);
    productCategoryService.getAll.and.returnValue(of(categories));
    productCategoryService.getAllSubCategories.and.returnValue(of([]));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [ProductCategoryListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ProductCategoryService, useValue: productCategoryService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  it('should create and load root categories', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.productCategories.length).toBe(2);
    expect(productCategoryService.getAll).toHaveBeenCalledWith(false);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Dairy');
  });

  it('toggleRow expands a row and fetches its subcategories', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const subs = [{ id: 'pc3', name: 'Cheese', parentId: 'pc1' }] as ProductCategory[];
    productCategoryService.getAllSubCategories.and.returnValue(of(subs));
    component.toggleRow(categories[0]);
    expect(component.expandedElement?.id).toBe('pc1');
    expect(productCategoryService.getAllSubCategories).toHaveBeenCalledWith('pc1');
    expect(component.subCategories).toEqual(subs);
    component.toggleRow(categories[0]);
    expect(component.expandedElement).toBeNull();
    expect(component.subCategories).toEqual([]);
  });

  it('delete removes from the right list depending on parent', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    productCategoryService.delete.and.returnValue(of(void 0));
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    const sub = { id: 'pc3', name: 'Cheese', parentId: 'pc1' } as ProductCategory;
    component.subCategories = [sub];
    component.deleteCategory(sub);
    expect(productCategoryService.delete).toHaveBeenCalledWith('pc3');
    expect(component.subCategories).toEqual([]);
    expect(component.productCategories.length).toBe(2);
    component.deleteCategory(categories[0]);
    expect(component.productCategories.map(c => c.id)).toEqual(['pc2']);
  });

  it('manage dialog result replaces a root category in place', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const updated = { id: 'pc2', name: 'Breads' } as ProductCategory;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    component.manageCategory(categories[1]);
    expect(component.productCategories[1].name).toBe('Breads');
    expect(component.productCategories.length).toBe(2);
  });

  it('manage dialog result for a new root category prepends sorted', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const created = { id: 'pc3', name: 'Alcohol' } as ProductCategory;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    component.manageCategory(null);
    expect(component.productCategories[0].name).toBe('Alcohol');
    expect(component.productCategories.length).toBe(3);
  });

  it('manage dialog result for a subcategory inserts sorted into sub list', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.subCategories = [{ id: 'pc4', name: 'Yogurt' } as ProductCategory];
    const created = { id: 'pc3', name: 'Cheese', parentId: 'pc1' } as ProductCategory;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    component.manageCategory({ id: 'pc1', name: 'Dairy' } as ProductCategory);
    expect(component.subCategories.map(c => c.name)).toEqual(['Cheese', 'Yogurt']);
  });

  it('addSubCategory opens the manage dialog seeded with the parent', () => {
    fixture = TestBed.createComponent(ProductCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.addSubCategory(categories[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      data: jasmine.objectContaining({ parentId: 'pc1' }),
    }));
  });
});
