import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaleOrderReturnItemComponent } from './sale-order-return-item.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('SaleOrderReturnItemComponent', () => {
  let component: SaleOrderReturnItemComponent;
  let fixture: ComponentFixture<SaleOrderReturnItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ SaleOrderReturnItemComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SaleOrderReturnItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('salesOrder', { id: 'so-1', salesOrderItems: [] } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
