import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { PageHelperListComponent } from './page-helper-list.component';
import { PageHelperListPresentationComponent } from '../page-helper-list-presentation/page-helper-list-presentation.component';
import { PageHelperService } from '../page-helper.service';
import { PageHelpPreviewComponent } from '@shared/page-help-preview/page-help-preview.component';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { PageHelper } from '@core/domain-classes/page-helper';

describe('PageHelperListComponent', () => {
  let component: PageHelperListComponent;
  let fixture: ComponentFixture<PageHelperListComponent>;
  let pageHelperService: jasmine.SpyObj<PageHelperService>;

  const helpers = [
    { id: 'ph1', name: 'Sales Page', code: 'SALES_ORDER', description: '<p>Help</p>' },
    { id: 'ph2', name: 'Purchase Page', code: 'PURCHASE_ORDER', description: '<p>Help</p>' },
  ] as unknown as PageHelper[];

  beforeEach(async () => {
    pageHelperService = jasmine.createSpyObj('PageHelperService', ['getPageHelpers']);
    pageHelperService.getPageHelpers.and.returnValue(of(helpers));

    TestBed.configureTestingModule({
      imports: [PageHelperListComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: PageHelperService, useValue: pageHelperService },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHelperListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load page helpers into the presentation list', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.pageHelpers.length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Sales Page');
  });
});

describe('PageHelperListPresentationComponent', () => {
  let component: PageHelperListPresentationComponent;
  let fixture: ComponentFixture<PageHelperListPresentationComponent>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: Router;

  const helpers = [
    { id: 'ph1', name: 'Sales Page', code: 'SALES_ORDER', description: '<p>Help</p>' },
    { id: 'ph2', name: 'Purchase Page', code: 'PURCHASE_ORDER', description: '<p>Help</p>' },
  ] as unknown as PageHelper[];

  beforeEach(async () => {
    commonService = jasmine.createSpyObj('CommonService', ['getPageHelperText']);
    commonService.getPageHelperText.and.returnValue(of({ id: 'ph1', description: '<p>Help</p>' } as PageHelper));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [PageHelperListPresentationComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: jasmine.createSpyObj('SecurityService', ['hasClaim']) },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHelperListPresentationComponent);
    component = fixture.componentInstance;
    component.pageHelpers = helpers;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create and render one row per helper', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.columnsToDisplay).toEqual(['action', 'name', 'code']);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('SALES_ORDER');
  });

  it('viewPageHelper fetches by code and opens the preview with a copy', () => {
    fixture.detectChanges();
    component.viewPageHelper(helpers[0]);
    expect(commonService.getPageHelperText).toHaveBeenCalledWith('SALES_ORDER');
    expect(dialog.open).toHaveBeenCalledWith(PageHelpPreviewComponent, jasmine.objectContaining({
      width: '100%',
      maxWidth: '70vw',
      data: { id: 'ph1', description: '<p>Help</p>' },
    }));
    const openedWith = dialog.open.calls.mostRecent().args[1] as any;
    expect(openedWith.data).not.toBe(helpers[0]);
  });

  it('managePageHelper navigates to the manage route with the id', () => {
    fixture.detectChanges();
    component.managePageHelper(helpers[1]);
    expect(router.navigate).toHaveBeenCalledWith(['/page-helper/manage', 'ph2']);
  });

  it('isOddDataRow and getDataIndex map rows correctly', () => {
    fixture.detectChanges();
    expect(component.isOddDataRow(0)).toBeFalse();
    expect(component.isOddDataRow(1)).toBeTrue();
    expect(component.getDataIndex(helpers[1])).toBe(1);
    expect(component.getDataIndex({} as any)).toBe(-1);
  });
});
