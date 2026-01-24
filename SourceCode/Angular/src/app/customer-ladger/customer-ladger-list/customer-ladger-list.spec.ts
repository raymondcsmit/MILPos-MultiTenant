import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerLadgerList } from './customer-ladger-list';

describe('CustomerLadgerList', () => {
  let component: CustomerLadgerList;
  let fixture: ComponentFixture<CustomerLadgerList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerLadgerList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerLadgerList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
