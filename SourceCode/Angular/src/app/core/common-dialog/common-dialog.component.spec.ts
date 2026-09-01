import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';

import { CommonDialogComponent } from './common-dialog.component';

describe('CommonDialogComponent', () => {
  let component: CommonDialogComponent;
  let fixture: ComponentFixture<CommonDialogComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CommonDialogComponent>>;

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<CommonDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [CommonDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(CommonDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close the dialog with the given data', () => {
    component.clickHandler(true);
    expect(dialogRef.close).toHaveBeenCalledWith(true);

    component.clickHandler(false);
    expect(dialogRef.close).toHaveBeenCalledWith(false);

    component.clickHandler();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should close with true when YES button clicked', () => {
    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should close with false when CANCEL button clicked', () => {
    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close without data when close icon clicked', () => {
    const icon = fixture.debugElement.query(By.css('mat-icon.close-icon'));
    icon.nativeElement.click();
    expect(dialogRef.close).toHaveBeenCalledWith(undefined);
  });
});
