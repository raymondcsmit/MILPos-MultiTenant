import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { of } from 'rxjs';

import { ManagePayRoll } from './manage-pay-roll';
import { PayRollService } from '../pay-roll.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { SecurityService } from '@core/security/security.service';
import { PaymentMode } from '../../accounting/account-enum';

describe('ManagePayRoll', () => {
  let component: ManagePayRoll;
  let fixture: ComponentFixture<ManagePayRoll>;
  let payRollService: jasmine.SpyObj<PayRollService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let router: Router;

  beforeEach(async () => {
    payRollService = jasmine.createSpyObj('PayRollService', ['getAllPayRoll', 'getEmployeesForDropDown', 'addPayRoll']);
    payRollService.getAllPayRoll.and.returnValue(of(new HttpResponse({ body: [], headers: new HttpHeaders().set('X-Pagination', JSON.stringify({ pageSize: 30, skip: 0, totalCount: 0 })) })));
    payRollService.getEmployeesForDropDown.and.returnValue(of([{ id: 'e1', name: 'John' }] as any[]));
    payRollService.addPayRoll.and.returnValue(of({ id: 'new-p' } as any));
    commonService = jasmine.createSpyObj('CommonService', ['getLocationsForCurrentUser', 'getPageHelperText']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', branchName: 'Main' }], selectedLocation: 'l1' } as any));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    TestBed.configureTestingModule({
      imports: [ManagePayRoll, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        { provide: PayRollService, useValue: payRollService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: of('ltr'), getValue: jasmine.createSpy('getValue').and.callFake((key: string) => key) }) },
        { provide: ToastrService, useValue: toastrService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { snapshot: {}, data: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagePayRoll);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create with defaults, patch branch from locations and load employees', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.payRollForm.get('paymentMode')?.value).toBe(PaymentMode.CASH);
    expect(component.payRollForm.get('branchId')?.value).toBe('l1');
    expect(component.employees.length).toBe(1);
    expect(component.payRollForm.get('salaryDate')?.value).toEqual(component.CurrentDate);
    expect(component.payRollForm.invalid).toBeTrue();
  });

  it('total salary auto-computes from basic + allowances + deductions', () => {
    fixture.detectChanges();
    component.payRollForm.patchValue({
      basicSalary: 1000, mobileBill: 100, foodBill: 50, bonus: 200,
      commission: 0, festivalBonus: 0, travelAllowance: 0, others: 0, advance: -50,
    });
    expect(component.payRollForm.get('totalSalary')?.value).toBe(1300);
  });

  it('invalid save marks touched and never reaches the service', () => {
    fixture.detectChanges();
    component.savePayRoll();
    expect(component.payRollForm.get('employeeId')?.touched).toBeTrue();
    expect(payRollService.addPayRoll).not.toHaveBeenCalled();
  });

  it('valid save posts FormData with mapped fields, toasts and navigates', fakeAsync(() => {
    fixture.detectChanges();
    component.payRollForm.patchValue({
      employeeId: 'e1', basicSalary: 1000, salaryMonth: '1', salaryDate: new Date(2026, 0, 31),
    });
    component.savePayRoll();
    tick(500);
    expect(payRollService.addPayRoll).toHaveBeenCalledWith(jasmine.any(FormData));
    const fd = payRollService.addPayRoll.calls.mostRecent().args[0] as FormData;
    expect(fd.get('employeeId')).toBe('e1');
    expect(fd.get('basicSalary')).toBe('1000');
    expect(fd.get('totalSalary')).toBe('1000');
    expect(fd.get('salaryDate')).toBe('2026-01-31');
    expect(toastrService.success).toHaveBeenCalledWith('PAY_ROLL_CREATED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/pay-roll/list']);
  }));

  it('removeAttachment flags the change and clears attachment fields', () => {
    fixture.detectChanges();
    component.payRollForm.patchValue({ attachment: 'f', attachmentName: 'f.pdf' });
    component.removeAttachment();
    expect(component.payRollForm.get('isAttachmentChange')?.value).toBeTrue();
    expect(component.payRollForm.get('attachment')?.value).toBe('');
    expect(component.payRollForm.get('attachmentName')?.value).toBe('');
    expect(component.AttachmentName).toBe('');
  });

  it('fileEvent reads the file into the form', async () => {
    fixture.detectChanges();
    const file = new File(['x'], 'slip.pdf', { type: 'application/pdf' });
    component.fileEvent({ target: { files: [file] } });
    await new Promise(r => setTimeout(r, 300));
    expect(component.payRollForm.get('attachment')?.value).toBe(file);
    expect(component.payRollForm.get('attachmentName')?.value).toBe('slip.pdf');
    expect(component.payRollForm.get('isAttachmentChange')?.value).toBeTrue();
    expect(component.isAttachmentDeleted).toBeTrue();
  });

  it('fileEvent with an empty file list only flags deletion', () => {
    fixture.detectChanges();
    component.fileEvent({ target: { files: [] } });
    expect(component.isAttachmentDeleted).toBeTrue();
    expect(component.payRollForm.get('attachmentName')?.value).toBe('');
  });
});
