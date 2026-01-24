import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoveLicenseKeyComponent } from './remove-license-key.component';

describe('RemoveLicenseKeyComponent', () => {
  let component: RemoveLicenseKeyComponent;
  let fixture: ComponentFixture<RemoveLicenseKeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoveLicenseKeyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoveLicenseKeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
