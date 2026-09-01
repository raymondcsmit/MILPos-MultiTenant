import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageProductCategoryComponent } from './manage-product-category.component';
import { ProductCategoryService } from '@core/services/product-category.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ProductCategory } from '@core/domain-classes/product-category';

describe('ManageProductCategoryComponent', () => {
  let component: ManageProductCategoryComponent;
  let fixture: ComponentFixture<ManageProductCategoryComponent>;
  let productCategoryService: jasmine.SpyObj<ProductCategoryService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: ProductCategory): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageProductCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    productCategoryService = jasmine.createSpyObj<ProductCategoryService>('ProductCategoryService', ['add', 'update']);
    productCategoryService.add.and.returnValue(of({ id: 'pc9', name: 'Added' } as ProductCategory));
    productCategoryService.update.and.returnValue(of({ id: 'pc1', name: 'Updated' } as ProductCategory));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageProductCategoryComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ProductCategoryService, useValue: productCategoryService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with required name in add mode', () => {
    create({} as ProductCategory);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.categoryForm.get('name')?.hasError('required')).toBeTrue();
    expect(component.categoryForm.get('parentId')?.value).toBeUndefined();
  });

  it('seeds parentId when opened as add-subcategory', () => {
    create({ parentId: 'pc1' } as ProductCategory);
    expect(component.isEdit).toBeFalse();
    expect(component.categoryForm.get('parentId')?.value).toBe('pc1');
  });

  it('prefills form and enters edit mode from dialog data', () => {
    create({ id: 'pc1', name: 'Dairy', description: 'Milk stuff' } as ProductCategory);
    expect(component.isEdit).toBeTrue();
    expect(component.categoryForm.get('name')?.value).toBe('Dairy');
    expect(component.categoryForm.get('description')?.value).toBe('Milk stuff');
  });

  it('invalid submit does not call service and marks touched', () => {
    create({} as ProductCategory);
    component.saveCategory();
    expect(productCategoryService.add).not.toHaveBeenCalled();
    expect(productCategoryService.update).not.toHaveBeenCalled();
    expect(component.categoryForm.get('name')?.touched).toBeTrue();
  });

  it('valid submit adds category and closes dialog with result', () => {
    create({} as ProductCategory);
    component.categoryForm.get('name')?.setValue('Dairy');
    component.saveCategory();
    expect(productCategoryService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Dairy' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'pc9', name: 'Added' });
  });

  it('valid submit in edit mode updates by form id', () => {
    create({ id: 'pc1', name: 'Dairy' } as ProductCategory);
    component.categoryForm.get('name')?.setValue('Dairy Fresh');
    component.saveCategory();
    expect(productCategoryService.update).toHaveBeenCalledWith('pc1', jasmine.objectContaining({ name: 'Dairy Fresh' }));
    expect(productCategoryService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'pc1', name: 'Updated' });
  });

  it('cancel closes dialog without saving', () => {
    create({} as ProductCategory);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(productCategoryService.add).not.toHaveBeenCalled();
  });
});
