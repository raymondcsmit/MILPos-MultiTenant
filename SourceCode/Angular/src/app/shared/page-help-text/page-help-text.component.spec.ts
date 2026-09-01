import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { PageHelpTextComponent } from './page-help-text.component';
import { CommonService } from '@core/services/common.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { PageHelpPreviewComponent } from '@shared/page-help-preview/page-help-preview.component';
import { PageHelper } from '@core/domain-classes/page-helper';

describe('PageHelpTextComponent', () => {
  let component: PageHelpTextComponent;
  let fixture: ComponentFixture<PageHelpTextComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const help = { id: 'ph1', name: 'Sales Page', description: '<p>Help</p>' } as any;

  beforeEach(async () => {
    commonService = jasmine.createSpyObj('CommonService', ['getPageHelperText']);
    dialog = jasmine.createSpyObj('MatDialog', ['open', 'closeAll']);
    toastrService = jasmine.createSpyObj('ToastrService', ['error']);
    translationService = jasmine.createSpyObj('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('NO_HELP_TEXT_FOUND');

    TestBed.configureTestingModule({
      imports: [PageHelpTextComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CommonService, useValue: commonService },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHelpTextComponent);
    component = fixture.componentInstance;
    component.code = 'SALES_ORDER';
  });

  it('should create with code input', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.code).toBe('SALES_ORDER');
  });

  it('opens preview dialog with a copy of the help text', () => {
    commonService.getPageHelperText.and.returnValue(of(help));
    fixture.detectChanges();
    component.viewPageHelp();
    expect(commonService.getPageHelperText).toHaveBeenCalledWith('SALES_ORDER');
    expect(dialog.open).toHaveBeenCalledWith(PageHelpPreviewComponent, jasmine.objectContaining({
      maxWidth: '70vw',
      width: '100%',
      maxHeight: '80vh',
      data: { id: 'ph1', name: 'Sales Page', description: '<p>Help</p>' },
    }));
    const openedWith = dialog.open.calls.mostRecent().args[1] as any;
    expect(openedWith.data).not.toBe(help);
  });

  it('shows error toast when no help text found', () => {
    commonService.getPageHelperText.and.returnValue(of(null as unknown as PageHelper));
    fixture.detectChanges();
    component.viewPageHelp();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(toastrService.error).toHaveBeenCalledWith('NO_HELP_TEXT_FOUND');
  });
});
