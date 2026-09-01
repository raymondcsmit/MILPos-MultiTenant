import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ManageUnitConversationComponent } from './manage-unit-conversation.component';
import { UnitConversationService } from '@core/services/unit-conversation.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { UnitConversation } from '@core/domain-classes/unit-conversation';

describe('ManageUnitConversationComponent', () => {
  let component: ManageUnitConversationComponent;
  let fixture: ComponentFixture<ManageUnitConversationComponent>;
  let unitConversationService: jasmine.SpyObj<UnitConversationService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };

  const units: UnitConversation[] = [
    { id: 'u1', name: 'Piece', code: 'PCS' } as UnitConversation,
    { id: 'u2', name: 'Dozen', code: 'DZN', parentId: 'u1' } as UnitConversation,
    { id: 'u3', name: 'Liter', code: 'LTR' } as UnitConversation,
  ];

  function create(unitdata: UnitConversation): void {
    dialogRef = { close: jasmine.createSpy('close') };
    TestBed.overrideProvider(MatDialogRef, { useValue: dialogRef });
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { unitdata, units } });
    fixture = TestBed.createComponent(ManageUnitConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    unitConversationService = jasmine.createSpyObj<UnitConversationService>('UnitConversationService', ['getAll', 'add', 'update']);
    unitConversationService.getAll.and.returnValue(of(units));
    unitConversationService.add.and.returnValue(of({ id: 'u9', name: 'Box', code: 'BOX' } as UnitConversation));
    unitConversationService.update.and.returnValue(of({ id: 'u1', name: 'Piece', code: 'PC' } as UnitConversation));
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();

    TestBed.configureTestingModule({
      imports: [ManageUnitConversationComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: UnitConversationService, useValue: unitConversationService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { unitdata: {}, units: [] } },
      ],
    });
  });

  it('should create, load unit list and expose operators', () => {
    create({} as UnitConversation);
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.unitOperatorslist.length).toBe(3);
    expect(component.baseUnits.map(u => u.id)).toEqual(['u1', 'u3']);
    expect(component.unitOperators.length).toBeGreaterThan(0);
    expect(component.unitConversationForm.invalid).toBeTrue();
  });

  it('prefills form in edit mode and excludes self from base units', () => {
    const unitdata = { id: 'u1', name: 'Piece', code: 'PCS' } as UnitConversation;
    create(unitdata);
    expect(component.isEdit).toBeTrue();
    expect(component.unitConversationForm.get('name')?.value).toBe('Piece');
    expect(component.unitConversationForm.get('code')?.value).toBe('PCS');
    expect(component.baseUnits.map(u => u.id)).toEqual(['u3']);
  });

  it('name and code are required, invalid submit does not call service', () => {
    create({} as UnitConversation);
    component.unitConversationForm.get('code')?.setValue('BOX');
    component.saveUnitConversation();
    expect(unitConversationService.add).not.toHaveBeenCalled();
    expect(component.unitConversationForm.get('name')?.touched).toBeTrue();
  });

  it('valid submit adds unit conversation and closes dialog', () => {
    create({} as UnitConversation);
    component.unitConversationForm.get('name')?.setValue('Box');
    component.unitConversationForm.get('code')?.setValue('BOX');
    component.saveUnitConversation();
    expect(unitConversationService.add).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Box', code: 'BOX' }));
    expect(toastrService.success).toHaveBeenCalledWith('TRANSLATED');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'u9', name: 'Box', code: 'BOX' });
  });

  it('valid submit in edit mode updates unit conversation', () => {
    const unitdata = { id: 'u1', name: 'Piece', code: 'PCS' } as UnitConversation;
    create(unitdata);
    component.unitConversationForm.get('code')?.setValue('PC');
    component.saveUnitConversation();
    expect(unitConversationService.update).toHaveBeenCalledWith('u1', jasmine.objectContaining({ code: 'PC' }));
    expect(unitConversationService.add).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'u1', name: 'Piece', code: 'PC' });
  });

  it('onCountryChange enables operator flag', () => {
    create({} as UnitConversation);
    expect(component.isOperator).toBeFalse();
    component.onCountryChange('u1');
    expect(component.isOperator).toBeTrue();
  });

  it('cancel closes dialog without saving', () => {
    create({} as UnitConversation);
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
    expect(unitConversationService.add).not.toHaveBeenCalled();
  });
});
