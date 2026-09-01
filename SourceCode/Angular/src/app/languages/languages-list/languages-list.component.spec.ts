import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { LanguagesListComponent } from './languages-list.component';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { environment } from '@environments/environment';

describe('LanguagesListComponent', () => {
  let component: LanguagesListComponent;
  let fixture: ComponentFixture<LanguagesListComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;

  const languages = [
    { id: 'l1', name: 'English', code: 'en', order: 1, imageUrl: '/uploads/en.png' },
    { id: 'l2', name: 'French', code: 'fr', order: 2, imageUrl: '/uploads/fr.png' },
  ];

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    commonDialogService = jasmine.createSpyObj<CommonDialogService>('CommonDialogService', ['deleteConformationDialog']);

    TestBed.configureTestingModule({
      imports: [LanguagesListComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonDialogService, useValue: commonDialogService },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function load(): void {
    fixture = TestBed.createComponent(LanguagesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'language')
      .flush(languages.map(l => ({ ...l })));
    fixture.detectChanges();
  }

  it('should create, load languages and prefix image urls with api base', () => {
    load();
    expect(component).toBeTruthy();
    expect(component.languages.length).toBe(2);
    expect(component.languages[0].imageUrl).toBe(`${environment.apiUrl}/uploads/en.png`);
    expect(fixture.nativeElement.querySelector('table')?.textContent).toContain('English');
  });

  it('delete confirmation deletes and reloads the list', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    component.deleteLanguage(languages[0]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('TRANSLATED?');
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === 'language/l1').flush(null);
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'language').flush([{ ...languages[1] }]);
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(component.languages.length).toBe(1);
  });

  it('declined delete confirmation does not call api', () => {
    load();
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    component.deleteLanguage(languages[0]);
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(component.languages.length).toBe(2);
  });
});
