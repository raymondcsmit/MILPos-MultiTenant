import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountBalanceReportComponent } from './account-balance-report.component';

describe('AccountBalanceReportComponent', () => {
  let component: AccountBalanceReportComponent;
  let fixture: ComponentFixture<AccountBalanceReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountBalanceReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
