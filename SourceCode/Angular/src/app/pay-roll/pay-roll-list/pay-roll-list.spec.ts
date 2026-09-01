import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpHeaders, HttpEventType, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';

import { PayRollList } from './pay-roll-list';
import { PayRollService } from '../pay-roll.service';
import { CommonService } from '@core/services/common.service';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { SecurityService } from '@core/security/security.service';
import { PayRoll } from '../pay-roll';

describe('PayRollList', () => {
  let component: PayRollList;
  let fixture: ComponentFixture<PayRollList>;
  let payRollService: jasmine.SpyObj<PayRollService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let lastResource: any;

  const payRolls = [
    { id: 'p1', salaryDate: '2026-01-31T00:00:00Z', employeeName: 'John', branchName: 'Main', salaryMonth: '1', paymentMode: 0, basicSalary: 1000, totalSalary: 1200, attachment: 'slip.pdf' },
    { id: 'p2', salaryDate: '2026-02-28T00:00:00Z', employeeName: 'Jane', branchName: 'Main', salaryMonth: '2', paymentMode: 1, basicSalary: 900, totalSalary: 950 },
  ] as unknown as PayRoll[];

  function create() {
    fixture = TestBed.createComponent(PayRollList);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    payRollService = jasmine.createSpyObj('PayRollService', ['getAllPayRoll', 'getEmployeesForDropDown', 'downloadAttachment']);
    payRollService.getAllPayRoll.and.callFake((r: any) => {
      lastResource = { employeeId: r.employeeId, branchId: r.branchId, salaryMonth: r.salaryMonth, paymentMode: r.paymentMode, fromDate: r.fromDate, toDate: r.toDate, skip: r.skip, pageSize: r.pageSize, orderBy: r.orderBy };
      return of(new HttpResponse({
        body: payRolls,
        headers: new HttpHeaders().set('X-Pagination', JSON.stringify({ pageSize: 30, skip: 0, totalCount: payRolls.length })),
      }));
    });
    payRollService.getEmployeesForDropDown.and.returnValue(of([{ id: 'e1', name: 'John' }] as any[]));
    payRollService.downloadAttachment.and.returnValue(of(new HttpResponse({ body: new Blob(['x'], { type: 'application/pdf' }) })));
    commonService = jasmine.createSpyObj('CommonService', ['getLocationsForCurrentUser', 'getPageHelperText']);
    commonService.getLocationsForCurrentUser.and.returnValue(of({ locations: [{ id: 'l1', branchName: 'Main' }], selectedLocation: 'l1' } as any));

    TestBed.configureTestingModule({
      imports: [PayRollList, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PayRollService, useValue: payRollService },
        { provide: CommonService, useValue: commonService },
        { provide: TranslationService, useValue: Object.assign(jasmine.createSpyObj('TranslationService', ['getValue']), { lanDir$: of('ltr') }) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { snapshot: {}, data: of({}) } },
      ],
    }).compileComponents();
  });

  it('should create, load locations/employees and render payroll rows from the store', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.locations.length).toBe(1);
    expect(component.employees.length).toBe(1);
    expect(component.orderByColumn).toBe('salaryDate');
    expect(component.orderByDirection).toBe('desc');
    expect(component.payRollStore.payRolls().length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('John');
  }));

  it('filters feed the store query and reload', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    component.EmployeeFilter = 'e1';
    tick(1500);
    expect(lastResource.employeeId).toBe('e1');
    component.SalaryMonthFilter = '3';
    tick(1500);
    expect(lastResource.salaryMonth).toBe('3');
    component.PaymentModeFilter = '1';
    tick(1500);
    expect(lastResource.paymentMode).toBe('1');
    component.LocationFilter = 'l2';
    tick(1500);
    expect(lastResource.branchId).toBe('l2');
  }));

  it('date filters parse dates and null clears both bounds', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    component.FromDateFilter = new Date(2026, 0, 1);
    tick(2200);
    expect(lastResource.fromDate).toEqual(new Date(2026, 0, 1));
    component.FromDateFilter = null;
    tick(2200);
    expect(lastResource.fromDate).toBeNull();
    expect(lastResource.toDate).toBeNull();
  }));

  it('clearDates clears both date filters', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    component.clearDates();
    tick(2200);
    expect(component.FromDateFilter).toBeNull();
    expect(component.ToDateFilter).toBeNull();
    expect(lastResource.fromDate).toBeNull();
  }));

  it('paginator page updates skip/pageSize and reloads', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    component.paginator.pageSize = 20;
    component.paginator.pageIndex = 1;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    tick(600);
    expect(lastResource.skip).toBe(20);
    expect(lastResource.pageSize).toBe(20);
  }));

  it('sort change resets page index and orders the reload', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    component.sort.active = 'employeeName';
    component.sort.direction = 'asc';
    component.paginator.pageIndex = 3;
    component.sort.sortChange.emit({ active: 'employeeName', direction: 'asc' } as any);
    tick(600);
    expect(component.paginator.pageIndex).toBe(0);
    expect(lastResource.orderBy).toBe('employeeName asc');
  }));

  it('employee name control debounces a search for employees', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    component.employeeNameControl.setValue('Jo');
    tick(600);
    expect(payRollService.getEmployeesForDropDown).toHaveBeenCalledWith('Jo');
    expect(component.employees.length).toBe(1);
  }));

  it('downloadAttachment anchors a download from the blob response', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    const createObjectURL = spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    component.downloadAttachment(payRolls[0]);
    tick();
    expect(payRollService.downloadAttachment).toHaveBeenCalledWith('slip.pdf');
    expect(createObjectURL).toHaveBeenCalled();
  }));

  it('getMonthName maps month ids and falls back to empty', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    const expected = component.Months.find(m => m.id === 1)?.name ?? '';
    expect(component.getMonthName(1)).toBe(expected);
    expect(component.getMonthName(999)).toBe('');
  }));

  it('isOddDataRow and getDataIndex map rows correctly', fakeAsync(() => {
    create();
    fixture.detectChanges();
    tick(600);
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(payRolls[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  }));
});
