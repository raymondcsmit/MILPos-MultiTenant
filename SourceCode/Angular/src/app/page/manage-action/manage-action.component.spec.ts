import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageActionComponent } from './manage-action.component';
import { ActionService } from '@core/services/action.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { Action } from '@core/domain-classes/action';

describe('ManageActionComponent', () => {
  let component: ManageActionComponent;
  let fixture: ComponentFixture<ManageActionComponent>;
  let actionService: jasmine.SpyObj<ActionService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  function create(data: any): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ManageActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    actionService = jasmine.createSpyObj<ActionService>('ActionService', ['addAction', 'updateAction']);
    actionService.addAction.and.returnValue(of({} as Action));
    actionService.updateAction.and.returnValue(of({} as Action));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageActionComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: ActionService, useValue: actionService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
  });

  it('should create with page name locked and required action fields', () => {
    create({ pagename: 'Products', pageId: 'pg1' });
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    const pagename = component.actionForm.get('pagename');
    expect(pagename?.value).toBe('Products');
    expect(pagename?.disabled).toBeTrue();
    ['name', 'order', 'code'].forEach(f => {
      expect(component.actionForm.get(f)?.hasError('required')).toBeTrue();
    });
  });

  it('prefills action fields and enters edit mode from dialog data', () => {
    create({ id: 'ac1', pagename: 'Products', pageId: 'pg1', name: 'View', order: 1, code: 'PRO_VIEW' });
    expect(component.isEdit).toBeTrue();
    expect(component.actionForm.get('name')?.value).toBe('View');
    expect(component.actionForm.get('code')?.value).toBe('PRO_VIEW');
    expect(component.actionForm.get('pagename')?.value).toBe('Products');
  });

  it('invalid submit does not call service and marks touched', () => {
    create({ pagename: 'Products', pageId: 'pg1' });
    component.actionForm.get('name')?.setValue('View');
    component.saveAction();
    expect(actionService.addAction).not.toHaveBeenCalled();
    expect(actionService.updateAction).not.toHaveBeenCalled();
    expect(component.actionForm.get('code')?.touched).toBeTrue();
  });

  it('valid submit adds action stamped with pageId and closes dialog', () => {
    create({ pagename: 'Products', pageId: 'pg1' });
    component.actionForm.get('name')?.setValue('View');
    component.actionForm.get('order')?.setValue('1');
    component.actionForm.get('code')?.setValue('PRO_VIEW_PRODUCT');
    component.saveAction();
    expect(actionService.addAction).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'View', order: '1', code: 'PRO_VIEW_PRODUCT', pageId: 'pg1',
    }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('valid submit in edit mode stamps the data id and updates', () => {
    create({ id: 'ac1', pagename: 'Products', pageId: 'pg1', name: 'View', order: 1, code: 'PRO_VIEW' });
    component.actionForm.get('name')?.setValue('List');
    component.saveAction();
    expect(actionService.updateAction).toHaveBeenCalledWith('ac1', jasmine.objectContaining({
      id: 'ac1', name: 'List', pageId: 'pg1',
    }));
    expect(actionService.addAction).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'ac1' }));
  });

  it('cancel closes dialog without saving', () => {
    create({ pagename: 'Products', pageId: 'pg1' });
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(actionService.addAction).not.toHaveBeenCalled();
  });
});
