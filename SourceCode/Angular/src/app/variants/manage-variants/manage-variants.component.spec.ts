import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageVariantsComponent } from './manage-variants.component';

describe('ManageVariantsComponent', () => {
  let component: ManageVariantsComponent;
  let fixture: ComponentFixture<ManageVariantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageVariantsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageVariantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
