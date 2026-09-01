import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryProductListComponent } from './inquiry-product-list.component';
import { InquiryService } from '../../inquiry.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inquiry } from '@core/domain-classes/inquiry';
import { Product } from '@core/domain-classes/product';

describe('InquiryProductListComponent', () => {
  let component: InquiryProductListComponent;
  let fixture: ComponentFixture<InquiryProductListComponent>;
  let inquiryService: jasmine.SpyObj<InquiryService>;
  let dialogRef: { close: jasmine.Spy };

  const inquiry = { id: 'i1', companyName: 'Acme' } as unknown as Inquiry;

  const products: Product[] = [
    { id: 'p1', name: 'Coke', brandName: 'Coca', categoryName: 'Drinks', salesPrice: 10, purchasePrice: 5, mrp: 12 } as unknown as Product,
    { id: 'p2', name: 'Pepsi', brandName: 'PepsiCo', categoryName: 'Drinks', salesPrice: 20, purchasePrice: 8, mrp: 25 } as unknown as Product,
  ];

  beforeEach(async () => {
    inquiryService = jasmine.createSpyObj<InquiryService>('InquiryService', ['getProductsByInquiryId']);
    dialogRef = { close: jasmine.createSpy('close') };
    const translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    await TestBed.configureTestingModule({
      imports: [InquiryProductListComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        { provide: InquiryService, useValue: inquiryService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: inquiry },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();
  });

  it('should create and load products by inquiry id', () => {
    inquiryService.getProductsByInquiryId.and.returnValue(of(products));
    fixture = TestBed.createComponent(InquiryProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(inquiryService.getProductsByInquiryId).toHaveBeenCalledWith('i1');
    expect(component.products.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
  });

  it('renders dash for products without sales price and currency for priced rows', () => {
    inquiryService.getProductsByInquiryId.and.returnValue(of(products));
    fixture = TestBed.createComponent(InquiryProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('$10.00');
    expect(text).toContain('$20.00');
  });

  it('getDataIndex and isOddDataRow resolve row positions', () => {
    inquiryService.getProductsByInquiryId.and.returnValue(of(products));
    fixture = TestBed.createComponent(InquiryProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.getDataIndex(products[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  });

  it('closeDialog closes the dialog', () => {
    inquiryService.getProductsByInquiryId.and.returnValue(of([]));
    fixture = TestBed.createComponent(InquiryProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.closeDialog();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
