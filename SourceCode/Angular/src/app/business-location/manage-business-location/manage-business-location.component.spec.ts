import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageBusinessLocationComponent } from './manage-business-location.component';
import { BusinessLocationService } from '../business-location.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { BusinessLocation } from '@core/domain-classes/business-location';

describe('ManageBusinessLocationComponent', () => {
  let component: ManageBusinessLocationComponent;
  let fixture: ComponentFixture<ManageBusinessLocationComponent>;
  let businessLocationService: jasmine.SpyObj<BusinessLocationService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: BusinessLocation): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageBusinessLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    businessLocationService = jasmine.createSpyObj<BusinessLocationService>('BusinessLocationService', ['createLocation', 'updateLocation']);
    businessLocationService.createLocation.and.returnValue(of({} as BusinessLocation));
    businessLocationService.updateLocation.and.returnValue(of({} as BusinessLocation));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageBusinessLocationComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: BusinessLocationService, useValue: businessLocationService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  function validFormValues(): void {
    component.locationForm.get('name')?.setValue('Main Branch');
    component.locationForm.get('address')?.setValue('Westlands Road');
    component.locationForm.get('fbrKey')?.setValue('FBR-123');
    component.locationForm.get('posid')?.setValue('POS-1');
    component.locationForm.get('apiBaseUrl')?.setValue('https://api.example.com');
  }

  it('should create with all required fields invalid', () => {
    create({} as BusinessLocation);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.locationForm.invalid).toBeTrue();
    ['name', 'address', 'fbrKey', 'posid', 'apiBaseUrl'].forEach(f => {
      expect(component.locationForm.get(f)?.hasError('required')).toBeTrue();
    });
  });

  it('prefills form from dialog data including PascalCase fallbacks', () => {
    const data = {
      id: 'l1', name: 'Main Branch', address: 'Road 1', email: 'a@b.c',
      FBRKey: 'FBR-XYZ', POSID: 'POS-9', ApiBaseUrl: 'https://x.y',
    } as unknown as BusinessLocation;
    create(data);
    expect(component.isEdit).toBeTrue();
    expect(component.locationForm.get('fbrKey')?.value).toBe('FBR-XYZ');
    expect(component.locationForm.get('posid')?.value).toBe('POS-9');
    expect(component.locationForm.get('apiBaseUrl')?.value).toBe('https://x.y');
  });

  it('invalid submit does not call service and marks touched', () => {
    create({} as BusinessLocation);
    component.locationForm.get('email')?.setValue('not-an-email');
    component.saveLocation();
    expect(businessLocationService.createLocation).not.toHaveBeenCalled();
    expect(businessLocationService.updateLocation).not.toHaveBeenCalled();
    expect(component.locationForm.get('name')?.touched).toBeTrue();
    expect(component.locationForm.get('email')?.hasError('email')).toBeTrue();
  });

  it('valid submit creates location and closes dialog with true', () => {
    create({} as BusinessLocation);
    validFormValues();
    component.saveLocation();
    expect(businessLocationService.createLocation).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Main Branch', fbrKey: 'FBR-123' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('valid submit in edit mode updates location', () => {
    create({ id: 'l1', name: 'Main Branch', address: 'Road 1', fbrKey: 'K', posid: 'P', apiBaseUrl: 'U' } as BusinessLocation);
    component.locationForm.get('name')?.setValue('Renamed Branch');
    component.saveLocation();
    expect(businessLocationService.updateLocation).toHaveBeenCalledWith('l1', jasmine.objectContaining({ name: 'Renamed Branch' }));
    expect(businessLocationService.createLocation).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('cancel closes dialog without saving', () => {
    create({} as BusinessLocation);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(businessLocationService.createLocation).not.toHaveBeenCalled();
  });
});
