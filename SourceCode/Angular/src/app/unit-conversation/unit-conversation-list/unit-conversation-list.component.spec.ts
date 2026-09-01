import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { UnitConversationListComponent } from './unit-conversation-list.component';
import { UnitConversationListPresentationComponent } from '../unit-conversation-list-presentation/unit-conversation-list-presentation.component';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { UnitConversation } from '@core/domain-classes/unit-conversation';

describe('UnitConversationListComponent', () => {
  let component: UnitConversationListComponent;
  let fixture: ComponentFixture<UnitConversationListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let presentation: UnitConversationListPresentationComponent;

  const units: UnitConversation[] = [
    { id: 'u1', name: 'Piece', code: 'PCS' } as UnitConversation,
    { id: 'u2', name: 'Dozen', code: 'DZN' } as UnitConversation,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [UnitConversationListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
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

  function flushGet(): void {
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'UnitConversations').flush(units);
  }

  function load(): void {
    fixture = TestBed.createComponent(UnitConversationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushGet();
    fixture.detectChanges();
    presentation = fixture.debugElement.query(p => p.componentInstance instanceof UnitConversationListPresentationComponent)!.componentInstance as UnitConversationListPresentationComponent;
  }

  it('should create and render units through presentation component', () => {
    load();
    expect(component).toBeTruthy();
    expect(presentation.unitConversations!.length).toBe(2);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Piece');
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('Dozen');
  });

  it('delete confirmation triggers api delete plus reload', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    presentation.deleteUnitConversation(units[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Piece'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'UnitConversation/u1').flush(null);
    fixture.detectChanges();
    flushGet();
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });

  it('declined delete does not call api', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    presentation.deleteUnitConversation(units[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
  });

  it('closed dialog with result triggers reload', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of({ id: 'u9', name: 'Box', code: 'BOX' }) } as any);
    presentation.manageUnitConversation(null);
    expect(dialog.open).toHaveBeenCalled();
    fixture.detectChanges();
    flushGet();
  });

  it('closed dialog without result does not reload', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    presentation.manageUnitConversation(null);
    httpMock.expectNone(r => r.method === 'GET' && r.url === 'UnitConversations');
  });
});
