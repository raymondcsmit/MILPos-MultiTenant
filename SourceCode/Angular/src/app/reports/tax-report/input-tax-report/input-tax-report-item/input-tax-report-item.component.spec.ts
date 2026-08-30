import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputTaxReportItemComponent } from './input-tax-report-item.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('InputTaxReportItemComponent', () => {
  let component: InputTaxReportItemComponent;
  let fixture: ComponentFixture<InputTaxReportItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [InputTaxReportItemComponent, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputTaxReportItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('purchaseOrder', { id: 'po-1', purchaseOrderItems: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
