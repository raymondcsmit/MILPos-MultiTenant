import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageBusinessLocationComponent } from './manage-business-location.component';

describe('ManageBusinessLocationComponent', () => {
  let component: ManageBusinessLocationComponent;
  let fixture: ComponentFixture<ManageBusinessLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageBusinessLocationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageBusinessLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
