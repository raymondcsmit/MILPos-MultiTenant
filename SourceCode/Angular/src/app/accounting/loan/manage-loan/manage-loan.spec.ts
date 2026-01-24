import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageLoan } from './manage-loan';

describe('ManageLoan', () => {
  let component: ManageLoan;
  let fixture: ComponentFixture<ManageLoan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageLoan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageLoan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
