import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageInquiryStatusComponent } from './manage-inquiry-status.component';
import { InquiryStatusService } from '@core/services/inquiry-status.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';

describe('ManageInquiryStatusComponent', () => {
  let component: ManageInquiryStatusComponent;
  let fixture: ComponentFixture<ManageInquiryStatusComponent>;
  let inquiryStatusService: jasmine.SpyObj<InquiryStatusService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: InquiryStatus): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageInquiryStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    inquiryStatusService = jasmine.createSpyObj<InquiryStatusService>('InquiryStatusService', ['add', 'update']);
    inquiryStatusService.add.and.returnValue(of({ id: 'st1', name: 'Added' } as InquiryStatus));
    inquiryStatusService.update.and.returnValue(of({ id: 'st2', name: 'Updated' } as InquiryStatus));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageInquiryStatusComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: InquiryStatusService, useValue: inquiryStatusService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with required name in add mode', () => {
    create({} as InquiryStatus);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.inquiryStatusForm.get('name')?.hasError('required')).toBeTrue();
  });

  it('prefills name and enters edit mode from dialog data', () => {
    create({ id: 'st2', name: '已成交' } as InquiryStatus);
    expect(component.isEdit).toBeTrue();
    expect(component.inquiryStatusForm.get('name')?.value).toBe('已成交');
  });

  it('invalid submit does not call service and marks touched', () => {
    create({} as InquiryStatus);
    component.saveInquiryStatus();
    expect(inquiryStatusService.add).not.toHaveBeenCalled();
    expect(inquiryStatusService.update).not.toHaveBeenCalled();
    expect(component.inquiryStatusForm.get('name')?.touched).toBeTrue();
  });

  it('valid submit adds inquiry status and closes dialog with result', () => {
    create({} as InquiryStatus);
    component.inquiryStatusForm.get('name')?.setValue('已成交');
    component.saveInquiryStatus();
    expect(inquiryStatusService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: '已成交' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'st1', name: 'Added' });
  });

  it('valid submit in edit mode updates by data id', () => {
    create({ id: 'st2', name: '已成交' } as InquiryStatus);
    component.inquiryStatusForm.get('name')?.setValue('Lost');
    component.saveInquiryStatus();
    expect(inquiryStatusService.update).toHaveBeenCalledWith('st2', jasmine.objectContaining({ name: 'Lost' }));
    expect(inquiryStatusService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'st2', name: 'Updated' });
  });

  it('cancel closes dialog without saving', () => {
    create({} as InquiryStatus);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(inquiryStatusService.add).not.toHaveBeenCalled();
  });
});
