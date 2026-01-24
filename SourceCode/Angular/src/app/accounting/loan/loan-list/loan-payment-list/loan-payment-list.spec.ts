import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPaymentList } from './loan-payment-list';

describe('LoanPaymentList', () => {
  let component: LoanPaymentList;
  let fixture: ComponentFixture<LoanPaymentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanPaymentList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanPaymentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
