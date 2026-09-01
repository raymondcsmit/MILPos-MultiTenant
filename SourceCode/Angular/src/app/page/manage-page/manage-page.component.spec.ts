import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManagePageComponent } from './manage-page.component';
import { PageService } from '@core/services/page.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { Page } from '@core/domain-classes/page';

describe('ManagePageComponent', () => {
  let component: ManagePageComponent;
  let fixture: ComponentFixture<ManagePageComponent>;
  let pageService: jasmine.SpyObj<PageService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: Page): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManagePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    pageService = jasmine.createSpyObj<PageService>('PageService', ['add', 'update']);
    pageService.add.and.returnValue(of({} as Page));
    pageService.update.and.returnValue(of({} as Page));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManagePageComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: PageService, useValue: pageService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with name and order required in add mode', () => {
    create({} as Page);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.pageForm.get('name')?.hasError('required')).toBeTrue();
    expect(component.pageForm.get('order')?.hasError('required')).toBeTrue();
  });

  it('prefills page form and enters edit mode from dialog data', () => {
    create({ id: 'pg1', name: 'Products', order: 2 } as Page);
    expect(component.isEdit).toBeTrue();
    expect(component.pageForm.get('name')?.value).toBe('Products');
    expect(component.pageForm.get('order')?.value).toBe(2);
  });

  it('invalid submit does not call service and marks touched', () => {
    create({} as Page);
    component.pageForm.get('name')?.setValue('Products');
    component.savePage();
    expect(pageService.add).not.toHaveBeenCalled();
    expect(pageService.update).not.toHaveBeenCalled();
    expect(component.pageForm.get('order')?.touched).toBeTrue();
  });

  it('valid submit adds page and closes dialog', () => {
    create({} as Page);
    component.pageForm.get('name')?.setValue('Products');
    component.pageForm.get('order')?.setValue('1');
    component.savePage();
    expect(pageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Products', order: '1' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('valid submit in edit mode stamps the data id and updates', () => {
    create({ id: 'pg1', name: 'Products', order: 2 } as Page);
    component.pageForm.get('name')?.setValue('Catalog');
    component.savePage();
    expect(pageService.update).toHaveBeenCalledWith('pg1', jasmine.objectContaining({ id: 'pg1', name: 'Catalog' }));
    expect(pageService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('cancel closes dialog without saving', () => {
    create({} as Page);
    component.onNoClick();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(pageService.add).not.toHaveBeenCalled();
  });
});
