import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageLoanPayment } from './manage-loan-payment';

describe('ManageLoanPayment', () => {
  let component: ManageLoanPayment;
  let fixture: ComponentFixture<ManageLoanPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageLoanPayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageLoanPayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
