import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ManageVariantsComponent } from './manage-variants.component';
import { VariantService } from '../variants.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Variant } from '@core/domain-classes/variant';

describe('ManageVariantsComponent', () => {
  let component: ManageVariantsComponent;
  let fixture: ComponentFixture<ManageVariantsComponent>;
  let variantService: jasmine.SpyObj<VariantService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialogRef: { close: jasmine.Spy };
  let dialogData: any;

  beforeEach(async () => {
    variantService = jasmine.createSpyObj('VariantService', ['getVariants', 'saveVariant', 'updateVariant', 'deleteVariant']);
    variantService.saveVariant.and.returnValue(of({ id: 'v9', name: 'Size', variantItems: [] } as Variant));
    variantService.updateVariant.and.returnValue(of({ id: 'v1', name: 'Color', variantItems: [] } as Variant));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    dialogRef = { close: jasmine.createSpy('close') };
    dialogData = {} as Variant;

    TestBed.configureTestingModule({
      imports: [ManageVariantsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: VariantService, useValue: variantService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageVariantsComponent);
    component = fixture.componentInstance;
  });

  it('should create in add mode with one empty variant item row', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.isEdit).toBeFalse();
    expect(component.variantItemsArray.length).toBe(1);
    expect(component.variantForm.invalid).toBeTrue();
  });

  it('edit mode patches the variant and pushes its items', () => {
    Object.assign(dialogData, { id: 'v1', name: 'Color', variantItems: [{ id: 'i1', name: 'Red' }, { id: 'i2', name: 'Blue' }] });
    fixture = TestBed.createComponent(ManageVariantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isEdit).toBeTrue();
    expect(component.variantForm.get('name')?.value).toBe('Color');
    expect(component.variantItemsArray.length).toBe(2);
    expect(component.variantForm.valid).toBeTrue();
  });

  it('invalid submit marks touched and calls no service', () => {
    fixture.detectChanges();
    component.saveCariant();
    expect(component.variantForm.get('name')?.touched).toBeTrue();
    expect(variantService.saveVariant).not.toHaveBeenCalled();
  });

  it('whitespace-only item names block the save with an error toast', () => {
    fixture.detectChanges();
    component.variantForm.patchValue({ name: 'Size' });
    component.variantItemsArray.at(0).patchValue({ name: '   ' });
    component.saveCariant();
    expect(toastrService.error).toHaveBeenCalledWith('PLEASE_ADD_AT_LEASE_ONE_VARIANT');
    expect(variantService.saveVariant).not.toHaveBeenCalled();
  });

  it('valid add save filters blank items without trimming values and closes with result', () => {
    fixture.detectChanges();
    component.variantForm.patchValue({ name: 'Size' });
    component.variantItemsArray.at(0).patchValue({ name: '  Large  ' });
    component.saveCariant();
    const arg = variantService.saveVariant.calls.mostRecent().args[0] as any;
    expect(arg.variantItems.length).toBe(1);
    expect(arg.variantItems[0].name).toBe('  Large  ');
    expect(toastrService.success).toHaveBeenCalledWith('VARIANT_SAVED_SUCCESSFULLY');
    expect(dialogRef.close).toHaveBeenCalledWith({ id: 'v9', name: 'Size', variantItems: [] });
  });

  it('valid edit save updates by id instead of posting', () => {
    Object.assign(dialogData, { id: 'v1', name: 'Color', variantItems: [{ id: 'i1', name: 'Red' }] });
    fixture = TestBed.createComponent(ManageVariantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.saveCariant();
    expect(variantService.updateVariant).toHaveBeenCalledWith('v1', jasmine.objectContaining({ id: 'v1', name: 'Color' }));
    expect(variantService.saveVariant).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('onAddAnotherName appends a row and onDeleteName removes it', () => {
    fixture.detectChanges();
    component.onAddAnotherName();
    expect(component.variantItemsArray.length).toBe(2);
    component.onDeleteName(1);
    expect(component.variantItemsArray.length).toBe(1);
  });

  it('onNameChange makes a filled item name required', () => {
    fixture.detectChanges();
    component.variantItemsArray.at(0).patchValue({ name: 'Large' });
    component.onNameChange({}, 0);
    expect(component.variantItemsArray.at(0).get('name')?.validator).toBeTruthy();
  });

  it('onCancel closes the dialog', () => {
    fixture.detectChanges();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
