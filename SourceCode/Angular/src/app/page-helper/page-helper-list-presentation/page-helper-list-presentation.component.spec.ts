import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageHelperListPresentationComponent } from './page-helper-list-presentation.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('PageHelperListPresentationComponent', () => {
  let component: PageHelperListPresentationComponent;
  let fixture: ComponentFixture<PageHelperListPresentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ PageHelperListPresentationComponent , TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageHelperListPresentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
