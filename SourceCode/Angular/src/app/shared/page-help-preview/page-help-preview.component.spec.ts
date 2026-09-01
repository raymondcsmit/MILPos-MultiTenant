import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PageHelpPreviewComponent } from './page-help-preview.component';
import { SecurityService } from '@core/security/security.service';

describe('PageHelpPreviewComponent', () => {
  let component: PageHelpPreviewComponent;
  let fixture: ComponentFixture<PageHelpPreviewComponent>;
  let dialogRef: { close: jasmine.Spy };
  let matDialog: { closeAll: jasmine.Spy };
  let router: Router;
  let securityService: jasmine.SpyObj<SecurityService>;

  beforeEach(async () => {
    dialogRef = { close: jasmine.createSpy('close') };
    matDialog = { closeAll: jasmine.createSpy('closeAll') };
    securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);

    TestBed.configureTestingModule({
      imports: [PageHelpPreviewComponent, MatDialogModule, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { id: 'ph1', description: '<p>Help body</p>' } },
        { provide: SecurityService, useValue: securityService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHelpPreviewComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create and prefill disabled description control', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.helperForm.get('description')?.value).toBe('<p>Help body</p>');
    expect(component.helperForm.get('description')?.disabled).toBeTrue();
  });

  it('onCancel closes the dialog', () => {
    fixture.detectChanges();
    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('editPageHelper closes all dialogs and navigates to manage page with id', () => {
    fixture.detectChanges();
    const dlg = (component as any).matDialogRef;
    spyOn(dlg, 'closeAll');
    component.editPageHelper();
    expect(dlg.closeAll).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/page-helper/manage/', 'ph1']);
  });

  it('renders edit action for users with claim', () => {
    securityService.hasClaim.and.returnValue(true);
    fixture.detectChanges();
    expect(securityService.hasClaim).toHaveBeenCalledWith('SETT_MANAGE_PAGE_HELPER');
    expect(fixture.nativeElement.querySelectorAll('mat-icon').length).toBe(2);
  });

  it('hides edit action for users without claim', () => {
    securityService.hasClaim.and.returnValue(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('mat-icon').length).toBe(1);
  });
});
