import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';

import { TransactionItemListComponent } from './transaction-item-list.component';
import { TransactionService } from '../transaction.service';
import { TranslationService } from '@core/services/translation.service';
import { SecurityService } from '@core/security/security.service';
import { CommonService } from '@core/services/common.service';
import { TransactionItem } from '../transaction-item';

describe('TransactionItemListComponent', () => {
  let component: TransactionItemListComponent;
  let fixture: ComponentFixture<TransactionItemListComponent>;
  let transactionService: jasmine.SpyObj<TransactionService>;

  const items: TransactionItem[] = [
    { id: 'i1', productId: 'p1', productName: 'Coke', quantity: 2, unitPrice: 10, discountAmount: 0, discountType: 'amount', taxPercentage: 10, taxAmount: 1, lineTotal: 11, status: 0 } as unknown as TransactionItem,
    { id: 'i2', productId: 'p2', productName: 'Pepsi', quantity: 1, unitPrice: 20, discountAmount: 5, discountType: 'percentage', discountPercentage: 5, taxPercentage: 0, taxAmount: 0, lineTotal: 15, status: 1 } as unknown as TransactionItem,
  ];

  beforeEach(async () => {
    transactionService = jasmine.createSpyObj<TransactionService>('TransactionService', ['getTransactionItems', 'getAllTransaction']);

    await TestBed.configureTestingModule({
      imports: [TransactionItemListComponent, TranslateModule.forRoot()],
      providers: [
        CurrencyPipe,
        { provide: TransactionService, useValue: transactionService },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: new BehaviorSubject<string>('ltr').asObservable() }) },
        { provide: SecurityService, useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionItemListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    transactionService.getTransactionItems.and.returnValue(of(items));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('transaction input change loads items by transaction id', () => {
    transactionService.getTransactionItems.and.returnValue(of(items));
    fixture.componentRef.setInput('transaction', { id: 't1' } as any);
    fixture.detectChanges();
    expect(transactionService.getTransactionItems).toHaveBeenCalledWith('t1');
    expect(component.transactionItems.length).toBe(2);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Coke');
    expect(text).toContain('Pepsi');
  });

  it('missing transaction id falls back to empty string id', () => {
    transactionService.getTransactionItems.and.returnValue(of([]));
    fixture.componentRef.setInput('transaction', {} as any);
    fixture.detectChanges();
    expect(transactionService.getTransactionItems).toHaveBeenCalledWith('');
    expect(component.transactionItems.length).toBe(0);
  });

  it('renders negative quantity for status 1 rows and currency columns', () => {
    transactionService.getTransactionItems.and.returnValue(of(items));
    fixture.componentRef.setInput('transaction', { id: 't1' } as any);
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('-1');
    expect(text).toContain('$10.00');
    expect(text).toContain('10%');
  });
});
