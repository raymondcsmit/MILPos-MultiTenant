import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryHistoryListComponent } from './inventory-history-list.component';
import { Inventory } from '@core/domain-classes/inventory';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('InventoryHistoryListComponent', () => {
  let component: InventoryHistoryListComponent;
  let fixture: ComponentFixture<InventoryHistoryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ InventoryHistoryListComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryHistoryListComponent);
    component = fixture.componentInstance;
    const inventory = {
      productId: 'product-1',
      currentStock: 10,
      pricePerUnit: 100,
      productName: 'Product A',
      unitName: 'pcs',
      averagePurchasePrice: 80,
      averageSalesPrice: 100,
      unitId: 'unit-1',
      locationId: 'location-1',
      type: 'product'
    } as Inventory;
    fixture.componentRef.setInput('inventory', inventory);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
