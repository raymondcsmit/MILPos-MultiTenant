import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageLedgerAccount } from './manage-ledger-account';

describe('ManageLedgerAccount', () => {
  let component: ManageLedgerAccount;
  let fixture: ComponentFixture<ManageLedgerAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageLedgerAccount]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageLedgerAccount);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
