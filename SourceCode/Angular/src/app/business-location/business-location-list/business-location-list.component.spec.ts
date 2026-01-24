import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessLocationListComponent } from './business-location-list.component';

describe('BusinessLocationListComponent', () => {
  let component: BusinessLocationListComponent;
  let fixture: ComponentFixture<BusinessLocationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BusinessLocationListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessLocationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
