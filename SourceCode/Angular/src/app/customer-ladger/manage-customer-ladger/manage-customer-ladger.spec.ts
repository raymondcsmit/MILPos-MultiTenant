import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageCustomerLadger } from './manage-customer-ladger';

describe('ManageCustomerLadger', () => {
  let component: ManageCustomerLadger;
  let fixture: ComponentFixture<ManageCustomerLadger>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageCustomerLadger]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageCustomerLadger);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
