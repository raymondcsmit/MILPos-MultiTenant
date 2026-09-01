import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { GenerateBarcodeComponent } from './generate-barcode.component';
import { SecurityService } from '@core/security/security.service';
import { BarcodeModel } from '@core/domain-classes/bar-code-generator';

describe('GenerateBarcodeComponent', () => {
  let component: GenerateBarcodeComponent;
  let fixture: ComponentFixture<GenerateBarcodeComponent>;
  let windowOpenSpy: jasmine.Spy;
  let writeSpy: jasmine.Spy;

  const barCodeData: BarcodeModel = {
    isPrintProudctName: true,
    isPrintPackagingDate: true,
    isPrintPrice: true,
    noOfLabelsPerPage: '20',
    products: [
      {
        productId: 'p1',
        productName: 'ProdA',
        barCode: '4006381333931',
        noOfLabels: 2,
        salesPrice: 5,
      },
    ],
  } as unknown as BarcodeModel;

  beforeEach(() => {
    const securityService = jasmine.createSpyObj<SecurityService>('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';

    TestBed.configureTestingModule({
      imports: [GenerateBarcodeComponent, TranslateModule.forRoot()],
      providers: [CurrencyPipe, { provide: SecurityService, useValue: securityService }],
    });

    writeSpy = jasmine.createSpy('document.write');
    windowOpenSpy = spyOn(window, 'open').and.returnValue({
      document: {
        open: () => undefined,
        write: writeSpy,
        close: () => undefined,
      },
    } as unknown as Window);
  });

  it('should create without generated data', () => {
    fixture = TestBed.createComponent(GenerateBarcodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.generateBarcode).toBeUndefined();
    expect(component.isLoading).toBeFalse();
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('should prepare label rows and print when barcode data arrives', fakeAsync(() => {
    fixture = TestBed.createComponent(GenerateBarcodeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('barCodeData', barCodeData);
    fixture.detectChanges();

    expect(component.generateBarcode).toBe(barCodeData);
    expect(component.barCodeData).toBeNull();
    expect(component.isLoading).toBeTrue();
    expect(component.generateBarcode!.products[0].noOfLabelsAarry).toEqual([0, 1]);
    expect(document.getElementById('product-p1-0')).toBeTruthy();
    expect(document.getElementById('product-p1-1')).toBeTruthy();

    tick(1000);
    expect(component.isLoading).toBeFalse();
    expect(windowOpenSpy).toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledWith(jasmine.stringContaining('ProdA'));
  }));

  it('should not print when the barcode data has no products', fakeAsync(() => {
    fixture = TestBed.createComponent(GenerateBarcodeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('barCodeData', { ...barCodeData, products: [] } as unknown as BarcodeModel);
    fixture.detectChanges();

    expect(component.isLoading).toBeFalse();
    tick(1000);
    expect(windowOpenSpy).not.toHaveBeenCalled();
  }));
});
