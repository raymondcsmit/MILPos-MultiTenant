import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { BarcodeGeneratorComponent } from './barcode-generator.component';
import { ProductService } from '../product/product.service';
import { ToastrService } from '@core/services/toastr.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { Product } from '@core/domain-classes/product';

describe('BarcodeGeneratorComponent', () => {
  let component: BarcodeGeneratorComponent;
  let fixture: ComponentFixture<BarcodeGeneratorComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let windowOpenSpy: jasmine.Spy;

  const plainProduct = { id: 'p1', name: 'ProdA', hasVariant: false, productUrl: 'a.png', salesPrice: 5, barcode: '4006381333931' } as unknown as Product;

  function createFixture(): void {
    fixture = TestBed.createComponent(BarcodeGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getProductsDropdown']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [BarcodeGeneratorComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        { provide: ProductService, useValue: productService },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        { provide: SecurityService, useValue: securityService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    });

    windowOpenSpy = spyOn(window, 'open').and.returnValue({
      document: {
        open: () => undefined,
        write: (content: string) => undefined,
        close: () => undefined,
      },
    } as unknown as Window);
  });

  it('should create with default label settings and an empty product list', () => {
    createFixture();
    expect(component).toBeTruthy();
    expect(component.barcodeForm.get('isPrintProudctName')?.value).toBeTrue();
    expect(component.barcodeForm.get('isPrintPackagingDate')?.value).toBeTrue();
    expect(component.barcodeForm.get('isPrintPrice')?.value).toBeTrue();
    expect(component.barcodeForm.get('noOfLabelsPerPage')?.value).toBe('20');
    expect(component.productFormArray.length).toBe(0);
  });

  it('should search products by name after the debounce', fakeAsync(() => {
    productService.getProductsDropdown.and.returnValue(of([plainProduct]));
    createFixture();
    component.productNameControl.setValue('chair');
    tick(1000);
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'chair', pageSize: 10, skip: 0, isBarcodeGenerated: true })
    );
  }));

  it('should add a plain product row on selection and reset the search control', () => {
    createFixture();
    component.productNameControl.setValue('ProdA');
    component.onProductSelection(plainProduct);
    expect(component.productFormArray.length).toBe(1);
    const row = component.productFormArray.at(0);
    expect(row.get('productId')?.value).toBe('p1');
    expect(row.get('productName')?.value).toBe('ProdA');
    expect(row.get('noOfLabels')?.value).toBe(1);
    expect(row.get('salesPrice')?.value).toBe(5);
    expect(row.get('barCode')?.value).toBe('4006381333931');
    expect(component.productNameControl.value).toBe('');
  });

  it('should add one row per variant child on variant product selection', () => {
    const variantProduct = { ...plainProduct, id: 'pv1', hasVariant: true } as unknown as Product;
    const children = [
      plainProduct,
      { ...plainProduct, id: 'p2', name: 'ProdB' } as unknown as Product,
    ];
    productService.getProductsDropdown.and.returnValue(of(children));
    createFixture();
    component.onProductSelection(variantProduct);
    expect(productService.getProductsDropdown).toHaveBeenCalledWith(
      jasmine.objectContaining({ parentId: 'pv1', pageSize: 10, isBarcodeGenerated: true })
    );
    expect(component.productFormArray.length).toBe(2);
    expect(component.productFormArray.at(0).get('productId')?.value).toBe('p1');
    expect(component.productFormArray.at(1).get('productId')?.value).toBe('p2');
  });

  it('should remove a product row by index', () => {
    createFixture();
    component.onProductSelection(plainProduct);
    component.onProductSelection({ ...plainProduct, id: 'p2', name: 'ProdB' } as unknown as Product);
    expect(component.productFormArray.length).toBe(2);
    component.onRemoveProduct(0);
    expect(component.productFormArray.length).toBe(1);
    expect(component.productFormArray.at(0).get('productName')?.value).toBe('ProdB');
  });

  it('should refuse to generate when no product is selected', () => {
    createFixture();
    component.generateBarcode();
    expect(toastr.error).toHaveBeenCalledWith('PLEASE_SELECT_AT_LEAST_ONE_PRODUCT');
    expect(component.barCodeData).toBeUndefined();
  });

  it('should build the barcode payload from the form rows for printing', fakeAsync(() => {
    createFixture();
    component.onProductSelection(plainProduct);
    component.generateBarcode();
    fixture.detectChanges();
    tick(1000);
    const data = component.barCodeData!;
    expect(data.products.length).toBe(1);
    expect(data.products[0].productId).toBe('p1');
    expect(data.products[0].noOfLabelsAarry.length).toBe(1);
    expect(data.noOfLabelsPerPage).toBe('20');
    expect(windowOpenSpy).toHaveBeenCalled();
  }));
});
