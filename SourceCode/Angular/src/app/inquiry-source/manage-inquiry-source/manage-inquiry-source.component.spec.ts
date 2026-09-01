import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageInquirySourceComponent } from './manage-inquiry-source.component';
import { InquirySourceService } from '@core/services/inquiry-source.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { InquirySource } from '@core/domain-classes/inquiry-source';

describe('ManageInquirySourceComponent', () => {
  let component: ManageInquirySourceComponent;
  let fixture: ComponentFixture<ManageInquirySourceComponent>;
  let inquirySourceService: jasmine.SpyObj<InquirySourceService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: InquirySource): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageInquirySourceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    inquirySourceService = jasmine.createSpyObj<InquirySourceService>('InquirySourceService', ['add', 'update']);
    inquirySourceService.add.and.returnValue(of({ id: 'is1', name: 'Added' } as InquirySource));
    inquirySourceService.update.and.returnValue(of({ id: 'is2', name: 'Updated' } as InquirySource));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageInquirySourceComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: InquirySourceService, useValue: inquirySourceService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with required name in add mode', () => {
    create({} as InquirySource);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.inquirySourceForm.get('name')?.hasError('required')).toBeTrue();
  });

  it('prefills name and enters edit mode from dialog data', () => {
    create({ id: 'is2', name: '展会' } as InquirySource);
    expect(component.isEdit).toBeTrue();
    expect(component.inquirySourceForm.get('name')?.value).toBe('展会');
  });

  it('invalid submit does not call service and marks touched', () => {
    create({} as InquirySource);
    component.saveInquirySource();
    expect(inquirySourceService.add).not.toHaveBeenCalled();
    expect(inquirySourceService.update).not.toHaveBeenCalled();
    expect(component.inquirySourceForm.get('name')?.touched).toBeTrue();
  });

  it('valid submit adds inquiry source and closes dialog with result', () => {
    create({} as InquirySource);
    component.inquirySourceForm.get('name')?.setValue('展会');
    component.saveInquirySource();
    expect(inquirySourceService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: '展会' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'is1', name: 'Added' });
  });

  it('valid submit in edit mode updates by data id', () => {
    create({ id: 'is2', name: '展会' } as InquirySource);
    component.inquirySourceForm.get('name')?.setValue('展会与推广');
    component.saveInquirySource();
    expect(inquirySourceService.update).toHaveBeenCalledWith('is2', jasmine.objectContaining({ name: '展会与推广' }));
    expect(inquirySourceService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'is2', name: 'Updated' });
  });

  it('cancel closes dialog without saving', () => {
    create({} as InquirySource);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(inquirySourceService.add).not.toHaveBeenCalled();
  });
});
