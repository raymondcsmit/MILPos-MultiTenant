import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { InquiryStatusListComponent } from './inquiry-status-list.component';
import { InquiryStatusListPresentationComponent } from '../inquiry-status-list-presentation/inquiry-status-list-presentation.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { InquiryStatus } from '@core/domain-classes/inquiry-status';

describe('InquiryStatusListComponent', () => {
  let component: InquiryStatusListComponent;
  let fixture: ComponentFixture<InquiryStatusListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let presentation: InquiryStatusListPresentationComponent;

  const statuses: InquiryStatus[] = [
    { id: 'st1', name: '已成交' } as InquiryStatus,
    { id: 'st2', name: 'Lost' } as InquiryStatus,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [InquiryStatusListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function load(): void {
    fixture = TestBed.createComponent(InquiryStatusListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'InquiryStatuses').flush(statuses);
    fixture.detectChanges();
    presentation = fixture.debugElement.query(p => p.componentInstance instanceof InquiryStatusListPresentationComponent)!.componentInstance as InquiryStatusListPresentationComponent;
  }

  it('should create, load statuses and feed presentation component', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.inquiryStatuses.length).toBe(2);
    expect(presentation.inquiryStatuses.length).toBe(2);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Lost');
  });

  it('presentation delete confirmation emits id and smart component deletes plus reloads', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    presentation.deleteInquiryStatus(statuses[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('已成交'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'InquiryStatus/st1').flush(null);
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'InquiryStatuses').flush(statuses);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });

  it('presentation declined delete does not emit handler', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    let emitted: string | null = null;
    presentation.deleteInquiryStatusHandler.subscribe(id => emitted = id);
    presentation.deleteInquiryStatus(statuses[0]);
    expect(emitted).toBeNull();
    httpMock.expectNone(r => r.method === 'DELETE');
  });

  it('presentation closed dialog with result replaces status in input list', () => {
    load();
    const updated = { id: 'st2', name: 'Archived' } as InquiryStatus;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    presentation.manageInquiryStatus(statuses[1]);
    expect(dialog.open).toHaveBeenCalled();
    expect(presentation.inquiryStatuses[1].name).toBe('Archived');
    expect(presentation.inquiryStatuses.length).toBe(2);
  });

  it('presentation closed dialog with new result appends status', () => {
    load();
    const created = { id: 'st3', name: 'Pending' } as InquiryStatus;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    presentation.manageInquiryStatus(null);
    expect(presentation.inquiryStatuses.length).toBe(3);
    expect(presentation.inquiryStatuses[2].name).toBe('Pending');
  });

  it('presentation closed dialog without result leaves list unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    presentation.manageInquiryStatus(null);
    expect(presentation.inquiryStatuses.length).toBe(2);
  });
});
