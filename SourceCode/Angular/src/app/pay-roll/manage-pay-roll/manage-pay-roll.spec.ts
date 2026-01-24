import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePayRoll } from './manage-pay-roll';

describe('ManagePayRoll', () => {
  let component: ManagePayRoll;
  let fixture: ComponentFixture<ManagePayRoll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagePayRoll]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagePayRoll);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
