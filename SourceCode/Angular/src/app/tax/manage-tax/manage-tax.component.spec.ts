import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageTaxComponent } from './manage-tax.component';
import { TaxService } from '@core/services/tax.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Tax } from '@core/domain-classes/tax';

describe('ManageTaxComponent', () => {
  let component: ManageTaxComponent;
  let fixture: ComponentFixture<ManageTaxComponent>;
  let taxService: jasmine.SpyObj<TaxService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: Tax): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageTaxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    taxService = jasmine.createSpyObj<TaxService>('TaxService', ['add', 'update']);
    taxService.add.and.returnValue(of({ id: 't1', name: 'GST', percentage: 5 } as Tax));
    taxService.update.and.returnValue(of({ id: 't2', name: 'VAT', percentage: 15 } as Tax));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageTaxComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: TaxService, useValue: taxService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with empty form', () => {
    create({} as Tax);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.taxForm.invalid).toBeTrue();
    expect(component.taxForm.get('percentage')?.value).toBe('');
  });

  it('prefills form and enters edit mode from dialog data', () => {
    const data = { id: 't2', name: 'VAT', percentage: 15 } as Tax;
    create(data);
    expect(component.isEdit).toBeTrue();
    expect(component.taxForm.get('name')?.value).toBe('VAT');
    expect(component.taxForm.get('percentage')?.value).toBe(15);
  });

  it('percentage outside 1-100 range is invalid and blocks submit', () => {
    create({} as Tax);
    component.taxForm.get('name')?.setValue('GST');
    component.taxForm.get('percentage')?.setValue(150);
    expect(component.taxForm.invalid).toBeTrue();
    component.saveTax();
    expect(taxService.add).not.toHaveBeenCalled();
    expect(component.taxForm.get('percentage')?.touched).toBeTrue();
  });

  it('valid submit adds tax and closes dialog with result', () => {
    create({} as Tax);
    component.taxForm.get('name')?.setValue('GST');
    component.taxForm.get('percentage')?.setValue(5);
    component.saveTax();
    expect(taxService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'GST', percentage: 5 }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 't1', name: 'GST', percentage: 5 });
  });

  it('valid submit in edit mode updates tax', () => {
    const data = { id: 't2', name: 'VAT', percentage: 15 } as Tax;
    create(data);
    component.taxForm.get('percentage')?.setValue(18);
    component.saveTax();
    expect(taxService.update).toHaveBeenCalledWith('t2', jasmine.objectContaining({ percentage: 18 }));
    expect(taxService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 't2', name: 'VAT', percentage: 15 });
  });

  it('cancel closes dialog without saving', () => {
    create({} as Tax);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(taxService.add).not.toHaveBeenCalled();
  });
});
