import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InquiryStatusListComponent } from './inquiry-status-list.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('InquiryStatusListComponent', () => {
  let component: InquiryStatusListComponent;
  let fixture: ComponentFixture<InquiryStatusListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ InquiryStatusListComponent , TranslateModule.forRoot()]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InquiryStatusListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
