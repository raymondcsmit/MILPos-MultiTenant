import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { ManageLanguageComponent } from './manage-language.component';
import { LanguagesService } from '../languages.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { environment } from '@environments/environment';

describe('ManageLanguageComponent', () => {
  let component: ManageLanguageComponent;
  let fixture: ComponentFixture<ManageLanguageComponent>;
  let httpMock: HttpTestingController;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const defaultLanguage = { LANGUAGE: 'English', SAVE: 'Save', order: '1' };
  let routeData: Subject<{ language: any }>;

  function create(routeLanguage: any): void {
    fixture = TestBed.createComponent(ManageLanguageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    routeData.next({ language: routeLanguage });
    httpMock.expectOne(r => r.method === 'GET' && r.url === 'language/default').flush(defaultLanguage);
    fixture.detectChanges();
  }

  beforeEach(() => {
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    routeData = new Subject<{ language: any }>();

    TestBed.configureTestingModule({
      imports: [ManageLanguageComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null }, routeConfig: { path: 'languages' } },
            data: routeData.asObservable(),
            params: of({}),
            queryParams: of({}),
            paramMap: of({ get: () => null }),
            url: of([]),
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and build the form from default language keys in add mode', () => {
    create(null);
    expect(component).toBeTruthy();
    expect(component.selectedLanguage).toBeUndefined();
    expect(component.fields.sort()).toEqual(['LANGUAGE', 'SAVE', 'order'].sort());
    expect(component.languageForm.get('languageName')?.value).toBeNull();
    expect(component.languageForm.get('LANGUAGE')?.value).toBe('English');
    expect(component.languageForm.get('order')?.value).toBe('1');
    expect(component.languageForm.invalid).toBeTrue();
  });

  it('edit mode prefills name, rtl flag and codes from route data', () => {
    const language = {
      id: 'l1', name: 'French', isrtl: true, imageUrl: '/uploads/fr.png',
      codes: JSON.stringify({ LANGUAGE: 'Français', SAVE: 'Enregistrer', order: '2' }),
    };
    create(language);
    expect(component.selectedLanguage).toBe(language);
    expect(component.languageImgSrc).toBe(`${environment.apiUrl}/uploads/fr.png`);
    expect(component.languageForm.get('languageName')?.value).toBe('French');
    expect(component.languageForm.get('isrtl')?.value).toBeTrue();
    expect(component.languageForm.get('SAVE')?.value).toBe('Enregistrer');
    expect(component.languageForm.valid).toBeTrue();
  });

  it('invalid submit shows error and does not call the api', () => {
    create(null);
    component.onLanguageSubmit();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    httpMock.expectNone(r => r.method === 'POST' && r.url === 'language');
  });

  it('new language without an uploaded image is rejected with ADD_IMAGE', () => {
    create(null);
    component.languageForm.get('languageName')?.setValue('French');
    component.onLanguageSubmit();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    httpMock.expectNone(r => r.method === 'POST' && r.url === 'language');
  });

  it('valid new language with image posts payload and navigates back', () => {
    create(null);
    component.languageForm.get('languageName')?.setValue('French');
    component.isLanguageImageUpload = true;
    component.languageImgSrc = 'data:image/png;base64,AAA';
    component.onLanguageSubmit();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === 'language');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      name: 'French',
      code: 'English',
      isrtl: false,
      isLanguageImageUpload: true,
      languageImgSrc: 'data:image/png;base64,AAA',
    }));
    expect(JSON.parse(req.request.body.codes)).toEqual(defaultLanguage);
    req.flush({});
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });

  it('valid edit submits with the selected language id and PUTs', () => {
    const language = {
      id: 'l1', name: 'French', isrtl: false,
      codes: JSON.stringify({ LANGUAGE: 'Français', SAVE: 'Enregistrer', order: '2' }),
    };
    create(language);
    component.languageForm.get('languageName')?.setValue('Français (CA)');
    component.onLanguageSubmit();
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === 'language/l1');
    expect(req.request.body).toEqual(jasmine.objectContaining({ id: 'l1', name: 'Français (CA)' }));
    req.flush({});
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
  });
});
