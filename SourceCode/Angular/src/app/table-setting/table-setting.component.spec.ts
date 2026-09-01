import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

import { TableSettingComponent } from './table-setting.component';
import { TableSettingsStore } from './table-setting-store';
import { TranslationService } from '@core/services/translation.service';
import { ToastrService } from '@core/services/toastr.service';
import { CommonService } from '@core/services/common.service';
import { TableSetting } from '@core/domain-classes/table-setting';
import { TableSettingJson } from '@core/domain-classes/table-setting-json';

describe('TableSettingComponent', () => {
  let component: TableSettingComponent;
  let fixture: ComponentFixture<TableSettingComponent>;
  let store: any;
  let isTableSettingAdded: ReturnType<typeof signal<boolean>>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;
  let router: Router;
  let snapshot: { paramMap: { get: (k: string) => string | null } };

  const settings: TableSettingJson[] = [
    { key: 'name', header: 'NAME', width: 150, type: 'text', isVisible: true, orderNumber: 1, allowSort: true },
    { key: 'mobile', header: 'MOBILE', width: 120, type: 'text', isVisible: false, orderNumber: 2, allowSort: false },
  ];

  const tableSetting: TableSetting = { id: 7, screenName: 'Customers', settings };

  beforeEach(() => {
    isTableSettingAdded = signal(false);
    store = {
      customersTableSetting: () => tableSetting,
      suppliersTableSetting: () => null,
      purchaseOrdersTableSetting: () => null,
      transactionsTableSetting: () => null,
      saleOrdersTableSetting: () => null,
      productsTableSetting: () => null,
      isTableSettingAdded: isTableSettingAdded,
      updateTableSettingAdded: jasmine.createSpy('updateTableSettingAdded'),
      saveTableSettings: jasmine.createSpy('saveTableSettings'),
    };
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    snapshot = { paramMap: { get: (k: string) => 'CUSTOMERS' } };

    TestBed.configureTestingModule({
      imports: [TableSettingComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: TableSettingsStore, useValue: store },
        { provide: TranslationService, useValue: translationService },
        { provide: ToastrService, useValue: toastrService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open', 'closeAll']) },
        { provide: CommonService, useValue: jasmine.createSpyObj('CommonService', ['getPageHelperText']) },
        { provide: ActivatedRoute, useValue: { snapshot } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function createComponent(screenName: string): void {
    snapshot.paramMap.get = (k: string) => screenName;
    fixture = TestBed.createComponent(TableSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and build the settings form from the store', () => {
    createComponent('CUSTOMERS');
    expect(component).toBeTruthy();
    expect(component.screenName).toBe('CUSTOMERS');
    expect(component.settingsArray.length).toBe(2);
    expect(component.tableSettingsForm.get('screenName')?.value).toBe('CUSTOMERS');
    expect(component.tableSettingsForm.get('screenName')?.disabled).toBeTrue();
    expect(component.settingsArray.at(0).get('header')?.value).toBe('NAME');
  });

  it('save with no visible column shows error and does not save', () => {
    createComponent('CUSTOMERS');
    component.settingsArray.controls.forEach(g => g.get('isVisible')?.setValue(false));
    component.saveTableSettings();
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(store.saveTableSettings).not.toHaveBeenCalled();
  });

  it('save with at least one visible column calls the store with built settings', () => {
    createComponent('CUSTOMERS');
    component.saveTableSettings();
    expect(store.saveTableSettings).toHaveBeenCalledTimes(1);
    const saved = store.saveTableSettings.calls.mostRecent().args[0] as TableSetting;
    expect(saved.id).toBe(7);
    expect(saved.screenName).toBe('CUSTOMERS');
    expect(saved.settings.length).toBe(2);
    expect(saved.settings[0]).toEqual(jasmine.objectContaining({ key: 'name', width: 150, isVisible: true }));
  });

  it('invalid form marks touched and does not save', () => {
    createComponent('CUSTOMERS');
    component.settingsArray.at(0).get('width')?.setValue(null);
    component.saveTableSettings();
    expect(component.settingsArray.at(0).get('width')?.touched).toBeTrue();
    expect(store.saveTableSettings).not.toHaveBeenCalled();
  });

  it('isTableSettingAdded flag navigates back to the screen and resets the flag', () => {
    createComponent('CUSTOMERS');
    isTableSettingAdded.set(true);
    fixture.detectChanges();
    expect(store.updateTableSettingAdded).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/customer']);
  });
});
