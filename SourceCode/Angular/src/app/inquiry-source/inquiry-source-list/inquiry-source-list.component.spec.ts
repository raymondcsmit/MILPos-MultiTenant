import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { InquirySourceListComponent } from './inquiry-source-list.component';
import { InquirySourceListPresentationComponent } from '../inquiry-source-list-presentation/inquiry-source-list-presentation.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { InquirySource } from '@core/domain-classes/inquiry-source';

describe('InquirySourceListComponent', () => {
  let component: InquirySourceListComponent;
  let fixture: ComponentFixture<InquirySourceListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let presentation: InquirySourceListPresentationComponent;

  const sources: InquirySource[] = [
    { id: 'is1', name: '展会' } as InquirySource,
    { id: 'is2', name: 'Referral' } as InquirySource,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [InquirySourceListComponent, TranslateModule.forRoot()],
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
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function load(): void {
    fixture = TestBed.createComponent(InquirySourceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'InquirySources').flush(sources);
    fixture.detectChanges();
    presentation = fixture.debugElement.query(p => p.componentInstance instanceof InquirySourceListPresentationComponent)!.componentInstance as InquirySourceListPresentationComponent;
  }

  it('should create, load sources and feed presentation component', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.inquirySources.length).toBe(2);
    expect(presentation.inquirySources.length).toBe(2);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Referral');
  });

  it('presentation delete confirmation emits id and smart component deletes plus reloads', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    presentation.deleteInquirySource(sources[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('展会'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'InquirySource/is1').flush(null);
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'InquirySources').flush(sources);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });

  it('presentation declined delete does not emit handler', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    let emitted: string | null = null;
    presentation.deleteInquirySourceHandler.subscribe(id => emitted = id);
    presentation.deleteInquirySource(sources[0]);
    expect(emitted).toBeNull();
    httpMock.expectNone(r => r.method === 'DELETE');
  });

  it('presentation closed dialog with result replaces source in input list', () => {
    load();
    const updated = { id: 'is2', name: 'Word of Mouth' } as InquirySource;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    presentation.manageInquirySource(sources[1]);
    expect(dialog.open).toHaveBeenCalled();
    expect(presentation.inquirySources[1].name).toBe('Word of Mouth');
    expect(presentation.inquirySources.length).toBe(2);
  });

  it('presentation closed dialog with new result appends source', () => {
    load();
    const created = { id: 'is3', name: 'Cold Call' } as InquirySource;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    presentation.manageInquirySource(null);
    expect(presentation.inquirySources.length).toBe(3);
    expect(presentation.inquirySources[2].name).toBe('Cold Call');
  });

  it('presentation closed dialog without result leaves list unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    presentation.manageInquirySource(null);
    expect(presentation.inquirySources.length).toBe(2);
  });
});
