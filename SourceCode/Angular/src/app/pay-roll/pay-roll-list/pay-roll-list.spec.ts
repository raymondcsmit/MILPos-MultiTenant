import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayRollList } from './pay-roll-list';

describe('PayRollList', () => {
  let component: PayRollList;
  let fixture: ComponentFixture<PayRollList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayRollList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayRollList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
