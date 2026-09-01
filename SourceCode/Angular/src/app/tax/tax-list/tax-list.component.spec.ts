import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { TaxListComponent } from './tax-list.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Tax } from '@core/domain-classes/tax';

describe('TaxListComponent', () => {
  let component: TaxListComponent;
  let fixture: ComponentFixture<TaxListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const taxes: Tax[] = [
    { id: 't1', name: 'GST', percentage: 5 } as Tax,
    { id: 't2', name: 'VAT', percentage: 15 } as Tax,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [TaxListComponent, TranslateModule.forRoot()],
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
    fixture = TestBed.createComponent(TaxListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'Tax').flush(taxes);
    fixture.detectChanges();
  }

  it('should create and load taxes on init', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.taxes.length).toBe(2);
    expect(component.displayedColumns).toContain('percentage');
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('GST');
  });

  it('empty server response results in empty list', () => {
    fixture = TestBed.createComponent(TaxListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'Tax').flush([]);
    expect(component.taxes).toEqual([]);
  });

  it('delete confirms then removes tax from list', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteTax(taxes[1]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('VAT'));
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'Tax/t2').flush(null);
    expect(toastrService.success).toHaveBeenCalled();
    expect(component.taxes.map(t => t.id)).toEqual(['t1']);
  });

  it('declined delete confirmation does not call api', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteTax(taxes[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(component.taxes.length).toBe(2);
  });

  it('closed dialog result replaces existing tax', () => {
    load();
    const updated = { id: 't1', name: 'GST5', percentage: 5 } as Tax;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    component.manageTax(taxes[0]);
    expect(component.taxes[0].name).toBe('GST5');
    expect(component.taxes.length).toBe(2);
  });

  it('closed dialog result appends new tax', () => {
    load();
    const created = { id: 't3', name: 'VAT', percentage: 20 } as Tax;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    component.manageTax(null);
    expect(component.taxes.length).toBe(3);
  });

  it('dialog closed without result leaves list unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.manageTax(null);
    expect(component.taxes.length).toBe(2);
  });
});
