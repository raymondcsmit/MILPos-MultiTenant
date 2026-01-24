import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivateLicenseComponent } from './activate-license.component';

describe('ActivateLicenseComponent', () => {
  let component: ActivateLicenseComponent;
  let fixture: ComponentFixture<ActivateLicenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivateLicenseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivateLicenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
