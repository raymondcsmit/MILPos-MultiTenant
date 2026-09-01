import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { RemoveLicenseKeyComponent } from './remove-license-key.component';

describe('RemoveLicenseKeyComponent', () => {
  let component: RemoveLicenseKeyComponent;
  let fixture: ComponentFixture<RemoveLicenseKeyComponent>;
  const validCode = '12345678-1234-1234-1234-123456789012';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RemoveLicenseKeyComponent, TranslateModule.forRoot()],
    });
    fixture = TestBed.createComponent(RemoveLicenseKeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and build the purchase code form', () => {
    expect(component).toBeTruthy();
    expect(component.activatedForm.get('purchaseCode')?.value).toBe('');
    expect(component.activatedForm.get('purchaseCode')?.hasError('required')).toBeTrue();
  });

  it('should require a purchase code of at least 36 characters', () => {
    component.activatedForm.get('purchaseCode')?.setValue(validCode.slice(0, 35));
    expect(component.activatedForm.get('purchaseCode')?.hasError('minlength')).toBeTrue();
    component.activatedForm.get('purchaseCode')?.setValue(validCode);
    expect(component.activatedForm.valid).toBeTrue();
  });

  it('should mark the form touched when submitted while invalid', () => {
    component.onDeactiveLicense();
    expect(component.activatedForm.get('purchaseCode')?.touched).toBeTrue();
    expect(component.activatedForm.invalid).toBeTrue();
  });

  it('should do nothing on submit when the form is valid (deactivation is not wired)', () => {
    component.activatedForm.get('purchaseCode')?.setValue(validCode);
    expect(() => component.onDeactiveLicense()).not.toThrow();
    expect(component.activatedForm.valid).toBeTrue();
  });
});
