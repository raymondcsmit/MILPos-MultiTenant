import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageProductCategoryComponent } from './manage-product-category.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ManageProductCategoryComponent', () => {
  let component: ManageProductCategoryComponent;
  let fixture: ComponentFixture<ManageProductCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ ManageProductCategoryComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageProductCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
