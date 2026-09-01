import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { BrandListComponent } from './brand-list.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Brand } from '@core/domain-classes/brand';

describe('BrandListComponent', () => {
  let component: BrandListComponent;
  let fixture: ComponentFixture<BrandListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const brands: Brand[] = [
    { id: 'b1', name: 'Coke' } as Brand,
    { id: 'b2', name: 'Pepsi' } as Brand,
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [BrandListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: MatDialog, useValue: dialog },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function load(): void {
    fixture = TestBed.createComponent(BrandListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'Brands').flush(brands);
    fixture.detectChanges();
  }

  it('should create and load brands on init', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.brands.length).toBe(2);
    expect(component.brands[0].name).toBe('Coke');
    const row = fixture.nativeElement.querySelector('table')?.textContent || '';
    expect(row).toContain('Coke');
    expect(row).toContain('Pepsi');
  });

  it('delete confirms then removes brand from list', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteBrand(brands[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith(jasmine.stringContaining('Coke'));
    const req = httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'Brand/b1');
    req.flush(null);
    expect(toastrService.success).toHaveBeenCalled();
    expect(component.brands.map(b => b.id)).toEqual(['b2']);
  });

  it('declined delete confirmation does not call api', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteBrand(brands[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(component.brands.length).toBe(2);
  });

  it('closed dialog result replaces existing brand', () => {
    load();
    const updated = { id: 'b2', name: 'Pepsi Max' } as Brand;
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    component.manageBrand(brands[1]);
    expect(dialog.open).toHaveBeenCalled();
    expect(component.brands.length).toBe(2);
    expect(component.brands[1].name).toBe('Pepsi Max');
  });

  it('closed dialog result appends new brand', () => {
    load();
    const created = { id: 'b3', name: 'Fanta' } as Brand;
    dialog.open.and.returnValue({ afterClosed: () => of(created) } as any);
    component.manageBrand(null);
    expect(component.brands.length).toBe(3);
    expect(component.brands[2].name).toBe('Fanta');
  });

  it('dialog closed without result leaves list unchanged', () => {
    load();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.manageBrand(null);
    expect(component.brands.length).toBe(2);
  });
});
