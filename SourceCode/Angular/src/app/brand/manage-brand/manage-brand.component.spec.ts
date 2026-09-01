import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageBrandComponent } from './manage-brand.component';
import { BrandService } from '@core/services/brand.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { Brand } from '@core/domain-classes/brand';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';

describe('ManageBrandComponent', () => {
  let component: ManageBrandComponent;
  let fixture: ComponentFixture<ManageBrandComponent>;
  let brandService: jasmine.SpyObj<BrandService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: Brand | null): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageBrandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    brandService = jasmine.createSpyObj<BrandService>('BrandService', ['add', 'update']);
    brandService.add.and.returnValue(of({ id: 'b1', name: 'Added' } as Brand));
    brandService.update.and.returnValue(of({ id: 'e1', name: 'Updated' } as Brand));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageBrandComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: BrandService, useValue: brandService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create and build empty form for new brand', () => {
    create({} as Brand);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.brandForm).toBeDefined();
    expect(component.brandForm.get('name')?.value).toBe('');
    expect(component.brandForm.invalid).toBeTrue();
  });

  it('prefills form and enters edit mode from dialog data', () => {
    const data = { id: 'e1', name: 'Existing', imageUrl: '/uploads/brand.png' } as Brand;
    create(data);
    expect(component.isEdit).toBeTrue();
    expect(component.brandForm.get('name')?.value).toBe('Existing');
    expect(component.imgSrc).toContain('/uploads/brand.png');
  });

  it('invalid submit marks touched and does not call service', () => {
    create({} as Brand);
    component.brandForm.get('name')?.setValue('');
    component.saveBrand();
    expect(brandService.add).not.toHaveBeenCalled();
    expect(brandService.update).not.toHaveBeenCalled();
    expect(component.brandForm.get('name')?.touched).toBeTrue();
  });

  it('valid submit adds brand and closes dialog with result', () => {
    create({} as Brand);
    component.brandForm.get('name')?.setValue('New Brand');
    component.imgSrc = 'data:image/png;base64,AAA';
    component.isImageUpload = true;
    component.saveBrand();
    expect(brandService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'New Brand', imageUrlData: 'data:image/png;base64,AAA', isImageChanged: true }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'b1', name: 'Added' });
  });

  it('valid submit in edit mode updates brand', () => {
    const data = { id: 'e1', name: 'Existing' } as Brand;
    create(data);
    component.brandForm.get('name')?.setValue('Renamed');
    component.saveBrand();
    expect(brandService.update).toHaveBeenCalledWith('e1', jasmine.objectContaining({ name: 'Renamed' }));
    expect(brandService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'e1', name: 'Updated' });
  });

  it('cancel closes dialog without saving', () => {
    create({} as Brand);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(brandService.add).not.toHaveBeenCalled();
  });
});
