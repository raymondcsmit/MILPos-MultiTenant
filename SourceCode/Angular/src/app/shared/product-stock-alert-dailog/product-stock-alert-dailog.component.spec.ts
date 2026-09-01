import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ProductStockAlertDailogComponent } from './product-stock-alert-dailog.component';
import { TranslationService } from '@core/services/translation.service';

describe('ProductStockAlertDailogComponent', () => {
  let component: ProductStockAlertDailogComponent;
  let fixture: ComponentFixture<ProductStockAlertDailogComponent>;
  let dialogRef: { close: jasmine.Spy };

  const alerts = [
    { name: 'Coke', stock: 2, unitName: 'pcs', itemCount: 5, selectedUnitName: 'box' },
    { name: 'Pepsi', stock: 0, unitName: '', itemCount: 1, selectedUnitName: '' },
  ] as any[];

  beforeEach(async () => {
    dialogRef = { close: jasmine.createSpy('close') };
    const translationService = jasmine.createSpyObj('TranslationService', ['getValue']);

    TestBed.configureTestingModule({
      imports: [ProductStockAlertDailogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: alerts },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductStockAlertDailogComponent);
    component = fixture.componentInstance;
  });

  it('should create and render one row per alerted product', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.displayedColumns).toEqual(['name', 'quantity']);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Coke');
    expect(rows[0].textContent).toContain('(pcs)');
    expect(rows[1].textContent).not.toContain('(');
  });

  it('onNoClick closes with no result', () => {
    fixture.detectChanges();
    component.onNoClick();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('proceed closes with true', () => {
    fixture.detectChanges();
    component.proceed();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
