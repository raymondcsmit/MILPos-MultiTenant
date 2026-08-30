import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageUnitConversationComponent } from './manage-unit-conversation.component';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('ManageUnitConversationComponent', () => {
  let component: ManageUnitConversationComponent;
  let fixture: ComponentFixture<ManageUnitConversationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: { unitdata: {}, units: [] } }, { provide: JwtHelperService, useValue: {} }, CurrencyPipe, provideNativeDateAdapter()],
      imports: [ ManageUnitConversationComponent , TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageUnitConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
