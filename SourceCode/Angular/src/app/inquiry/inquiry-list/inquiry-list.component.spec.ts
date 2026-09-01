import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryListComponent } from './inquiry-list.component';
import { InquiryService } from '../inquiry.service';
import { InquiryStatusService } from '@core/services/inquiry-status.service';
import { InquirySourceService } from '@core/services/inquiry-source.service';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { SecurityService } from '@core/security/security.service';
import { Inquiry } from '@core/domain-classes/inquiry';

describe('InquiryListComponent', () => {
  let component: InquiryListComponent;
  let fixture: ComponentFixture<InquiryListComponent>;
  let inquiryService: jasmine.SpyObj<InquiryService>;
  let inquiryStatusService: jasmine.SpyObj<InquiryStatusService>;
  let inquirySourceService: jasmine.SpyObj<InquirySourceService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;

  const inquiries: Inquiry[] = [
    { id: 'i1', companyName: 'Acme', email: 'a@x.com', mobileNo: '0300', cityName: 'Lahore', status: 'New', source: 'Web', assignToName: 'Ali', taskCount: 2, commentCount: 3, attachmentCount: 1 } as unknown as Inquiry,
    { id: 'i2', companyName: 'Globex', email: 'g@x.com', mobileNo: '0301', cityName: 'Karachi', status: 'Open', source: 'Phone', assignToName: 'Bo', taskCount: 0, commentCount: 0, attachmentCount: 0 } as unknown as Inquiry,
  ];

  function paginated<T>(body: T[], header: Record<string, number> = {}): HttpResponse<T[]> {
    return new HttpResponse({
      body,
      headers: new HttpHeaders({
        'X-Pagination': JSON.stringify({ totalCount: body.length, pageSize: 15, skip: 0, ...header }),
      }),
    });
  }

  beforeEach(async () => {
    inquiryService = jasmine.createSpyObj<InquiryService>('InquiryService', ['getInquiries', 'deleteInquiry', 'getProductsByInquiryId']);
    inquiryStatusService = jasmine.createSpyObj<InquiryStatusService>('InquiryStatusService', ['getAll']);
    inquirySourceService = jasmine.createSpyObj<InquirySourceService>('InquirySourceService', ['getAll']);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getAllUsers', 'getPageHelperText']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open', 'closeAll']);

    await TestBed.configureTestingModule({
      imports: [InquiryListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: InquiryService, useValue: inquiryService },
        { provide: InquiryStatusService, useValue: inquiryStatusService },
        { provide: InquirySourceService, useValue: inquirySourceService },
        { provide: CommonService, useValue: commonService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
        {
          provide: SecurityService,
          useValue: Object.assign(jasmine.createSpyObj('SecurityService', ['hasClaim']), { currencyCode: 'USD' }),
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function create(): void {
    inquiryStatusService.getAll.and.returnValue(of([{ id: 's1', name: 'New' } as any]));
    inquirySourceService.getAll.and.returnValue(of([{ id: 'src1', name: 'Web' } as any]));
    commonService.getAllUsers.and.returnValue(of([{ id: 'u1', firstName: 'Ali', lastName: 'Khan' } as any]));
    fixture = TestBed.createComponent(InquiryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load inquiries, statuses, sources and users on init', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries, { totalCount: 42 })));
    create();
    tick(0);
    expect(component).toBeTruthy();
    expect(inquiryService.getInquiries).toHaveBeenCalledOnceWith(jasmine.objectContaining({ pageSize: 15, skip: 0, orderBy: 'createdDate asc' }));
    expect(component.inquiries.length).toBe(2);
    expect(component.inquiryStatuses.length).toBe(1);
    expect(component.sourcesOfInquiry.length).toBe(1);
    expect(component.users.length).toBe(1);
    expect(component.inquiryResource.totalCount).toBe(42);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(text).toContain('Acme');
    expect(text).toContain('Globex');
  }));

  it('renders empty state row when no inquiries returned', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated([])));
    create();
    tick(0);
    const text = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(component.inquiries.length).toBe(0);
    expect(text).toContain('NO_DATA_FOUND');
  }));

  it('company name filter reloads with escaped companyName and reset skip', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValues(of(paginated(inquiries)), of(paginated(inquiries)));
    create();
    tick(0);
    component.CompanyNameFilter = 'Acme Co';
    tick(1000);
    const args = inquiryService.getInquiries.calls.mostRecent().args[0];
    expect(args.companyName).toBe(escape('Acme Co'));
    expect(args.skip).toBe(0);
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('email, mobile and city filters push their resource keys', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValues(of(paginated(inquiries)), of(paginated(inquiries)), of(paginated(inquiries)), of(paginated(inquiries)));
    create();
    tick(0);
    component.EmailFilter = 'g@x.com';
    tick(1000);
    expect(inquiryService.getInquiries.calls.mostRecent().args[0].email).toBe('g@x.com');
    component.MobileNoFilter = '0301';
    tick(1000);
    expect(inquiryService.getInquiries.calls.mostRecent().args[0].mobileNo).toBe('0301');
    component.CityFilter = 'Karachi';
    tick(1000);
    expect(inquiryService.getInquiries.calls.mostRecent().args[0].city).toBe('Karachi');
  }));

  it('status, source and assignTo filters push their resource keys', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValues(of(paginated(inquiries)), of(paginated(inquiries)), of(paginated(inquiries)), of(paginated(inquiries)));
    create();
    tick(0);
    component.StatusToFilter = 's1';
    tick(1000);
    expect(inquiryService.getInquiries.calls.mostRecent().args[0].inquiryStatusId).toBe('s1');
    component.SourceFilter = 'src1';
    tick(1000);
    expect(inquiryService.getInquiries.calls.mostRecent().args[0].inquirySourceId).toBe('src1');
    component.AssignToFilter = 'u1';
    tick(1000);
    expect(inquiryService.getInquiries.calls.mostRecent().args[0].assignTo).toBe('u1');
  }));

  it('sort change reloads with sort order and resets page index', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValues(of(paginated(inquiries)), of(paginated(inquiries)));
    create();
    tick(0);
    component.paginator.pageIndex = 2;
    component.sort.active = 'companyName';
    component.sort.direction = 'desc';
    component.sort.sortChange.emit({ active: 'companyName', direction: 'desc' } as Sort);
    tick(0);
    const args = inquiryService.getInquiries.calls.mostRecent().args[0];
    expect(args.orderBy).toBe('companyName desc');
    expect(component.paginator.pageIndex).toBe(0);
  }));

  it('paginator page reloads with computed skip and page size', fakeAsync(() => {
    let observed: any = null;
    inquiryService.getInquiries.and.callFake((r: any) => {
      observed = { skip: r.skip, pageSize: r.pageSize };
      return of(paginated(inquiries));
    });
    create();
    tick(0);
    component.paginator.pageIndex = 1;
    component.paginator.pageSize = 20;
    component.paginator.page.emit({ pageIndex: 1, pageSize: 20, length: 42 } as PageEvent);
    tick(0);
    expect(observed).toEqual({ skip: 20, pageSize: 20 });
  }));

  it('delete confirmed removes inquiry and reloads list', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries)));
    inquiryService.deleteInquiry.and.returnValue(of(void 0));
    create();
    tick(0);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteInquiry(inquiries[0]);
    tick(0);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('?'));
    expect(inquiryService.deleteInquiry).toHaveBeenCalledWith('i1');
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(component.paginator.pageIndex).toBe(0);
    expect(inquiryService.getInquiries.calls.count()).toBe(2);
  }));

  it('declined delete confirmation does not call delete api', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries)));
    create();
    tick(0);
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteInquiry(inquiries[0]);
    tick(0);
    expect(inquiryService.deleteInquiry).not.toHaveBeenCalled();
    expect(inquiryService.getInquiries.calls.count()).toBe(1);
  }));

  it('editInquiry navigates to manage route with id', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries)));
    create();
    tick(0);
    component.editInquiry('i1');
    expect(router.navigate).toHaveBeenCalledWith(['/inquiry/manage', 'i1']);
  }));

  it('addReminder opens reminder scheduler dialog with inquiry module reference', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries)));
    create();
    tick(0);
    component.addReminder('i1');
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: { application: 3, referenceId: 'i1' } }));
  }));

  it('viewProduct opens product list dialog with a copy of the inquiry', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries)));
    create();
    tick(0);
    component.viewProduct(inquiries[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: jasmine.objectContaining({ id: 'i1' }) }));
  }));

  it('getDataIndex and isOddDataRow resolve row positions', fakeAsync(() => {
    inquiryService.getInquiries.and.returnValue(of(paginated(inquiries)));
    create();
    tick(0);
    expect(component.getDataIndex(inquiries[1])).toBe(1);
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.isOddDataRow(0)).toBeFalse();
  }));
});
