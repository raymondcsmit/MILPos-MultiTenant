import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { VariantsListComponent } from './variants-list.component';
import { VariantService } from '../variants.service';
import { CommonDialogService } from '@core/common-dialog/common-dialog.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { Variant } from '@core/domain-classes/variant';

describe('VariantsListComponent', () => {
  let component: VariantsListComponent;
  let fixture: ComponentFixture<VariantsListComponent>;
  let variantService: jasmine.SpyObj<VariantService>;
  let commonDialogService: jasmine.SpyObj<CommonDialogService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const variants = [
    { id: 'v1', name: 'Color', variantItems: [{ id: 'i1', name: 'Red' }] },
    { id: 'v2', name: 'Size', variantItems: [{ id: 'i2', name: 'Large' }] },
  ] as unknown as Variant[];

  beforeEach(async () => {
    variantService = jasmine.createSpyObj('VariantService', ['getVariants', 'deleteVariant']);
    variantService.getVariants.and.returnValue(of(variants));
    variantService.deleteVariant.and.returnValue(of(undefined));
    commonDialogService = jasmine.createSpyObj('CommonDialogService', ['deleteConformationDialog']);
    commonDialogService.deleteConformationDialog.and.returnValue(of(true));
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.callFake((key: string) => key);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [VariantsListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: VariantService, useValue: variantService },
        { provide: CommonDialogService, useValue: commonDialogService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VariantsListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load variants into the table', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.variants.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Color');
  });

  it('manageVariant opens the dialog with a copy of the variant and reloads on close', () => {
    dialog.open.and.returnValue({ afterClosed: () => of({ id: 'v9' }) } as any);
    fixture.detectChanges();
    component.manageVariant(variants[0]);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
      width: '350px',
      data: { id: 'v1', name: 'Color', variantItems: [{ id: 'i1', name: 'Red' }] },
    }));
    const openedWith = dialog.open.calls.mostRecent().args[1] as any;
    expect(openedWith.data).not.toBe(variants[0]);
    expect(variantService.getVariants).toHaveBeenCalledTimes(2);
  });

  it('manageVariant(null) opens an empty dialog and does not reload on falsy close', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(null) } as any);
    fixture.detectChanges();
    component.manageVariant(null);
    expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ data: {} }));
    expect(variantService.getVariants).toHaveBeenCalledTimes(1);
  });

  it('deleteVariant confirms with the name, deletes by id, toasts and reloads', () => {
    fixture.detectChanges();
    component.deleteVariant(variants[1]);
    expect(commonDialogService.deleteConformationDialog).toHaveBeenCalledWith('ARE_YOU_SURE_YOU_WANT_TO_DELETE :: Size');
    expect(variantService.deleteVariant).toHaveBeenCalledWith('v2');
    expect(toastrService.success).toHaveBeenCalledWith('VARIANT_DELETED_SUCCESSFULLY');
    expect(variantService.getVariants).toHaveBeenCalledTimes(2);
  });

  it('declined confirmation does not delete', () => {
    commonDialogService.deleteConformationDialog.and.returnValue(of(false));
    fixture.detectChanges();
    component.deleteVariant(variants[0]);
    expect(variantService.deleteVariant).not.toHaveBeenCalled();
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(variants[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
