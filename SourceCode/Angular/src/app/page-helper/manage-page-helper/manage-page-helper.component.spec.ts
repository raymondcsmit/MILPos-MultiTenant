import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { ManagePageHelperComponent } from './manage-page-helper.component';
import { PageHelperService } from '../page-helper.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { PageHelper } from '@core/domain-classes/page-helper';

describe('ManagePageHelperComponent', () => {
  let component: ManagePageHelperComponent;
  let fixture: ComponentFixture<ManagePageHelperComponent>;
  let pageHelperService: jasmine.SpyObj<PageHelperService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let routeData: Subject<any>;
  let router: Router;

  beforeEach(async () => {
    routeData = new Subject<any>();
    pageHelperService = jasmine.createSpyObj('PageHelperService', ['getPageHelpers', 'updatePageHelper']);
    pageHelperService.updatePageHelper.and.returnValue(of({ id: 'ph1' } as PageHelper));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);

    TestBed.configureTestingModule({
      imports: [ManagePageHelperComponent, MatDialogModule, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PageHelperService, useValue: pageHelperService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ActivatedRoute, useValue: { data: routeData.asObservable(), snapshot: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagePageHelperComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create with an invalid empty form', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.pageHelperForm.get('name')?.hasError('required')).toBeTrue();
    expect(component.pageHelperForm.invalid).toBeTrue();
  });

  it('resolver data patches the form and stores the helper', () => {
    fixture.detectChanges();
    routeData.next({ pageHelper: { id: 'ph1', name: 'Sales Page', description: '<p>Help</p>', code: 'SALES_ORDER' } });
    expect(component.pageHelperForm.get('name')?.value).toBe('Sales Page');
    expect(component.pageHelperForm.get('description')?.value).toBe('<p>Help</p>');
    expect(component.pageHelper?.id).toBe('ph1');
  });

  it('invalid update marks touched and errors without calling the service', () => {
    fixture.detectChanges();
    component.update();
    expect(component.pageHelperForm.get('name')?.touched).toBeTrue();
    expect(pageHelperService.updatePageHelper).not.toHaveBeenCalled();
    expect(toastrService.error).toHaveBeenCalledWith('PLEASE_ENTER_PROPER_DATA');
  });

  it('valid update posts the built helper, toasts and navigates back', () => {
    fixture.detectChanges();
    routeData.next({ pageHelper: { id: 'ph1', name: 'Sales Page', description: '<p>Help</p>', code: 'SALES_ORDER' } });
    component.pageHelperForm.patchValue({ name: 'Renamed', description: '<p>New</p>' });
    component.update();
    expect(pageHelperService.updatePageHelper).toHaveBeenCalledWith({ id: 'ph1', name: 'Renamed', description: '<p>New</p>' });
    expect(toastrService.success).toHaveBeenCalledWith('PAGE_HELPER_UPDATED_SUCCESSFULLY');
    expect(router.navigate).toHaveBeenCalledWith(['/page-helper']);
  });
});
