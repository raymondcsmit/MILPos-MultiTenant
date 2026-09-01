import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CurrencyPipe } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';

import { ProfitLossReportComponent } from './profit-loss-report.component';
import { ProfitLossReportService } from './profit-loss-report.service';
import { CommonService } from '@core/services/common.service';
import { SecurityService } from '@core/security/security.service';
import { ToastrService } from '@core/services/toastr.service';
import { TranslationService } from '@core/services/translation.service';
import { ProfitLoss } from '@core/domain-classes/profitLoss';

describe('ProfitLossReportComponent', () => {
  let component: ProfitLossReportComponent;
  let fixture: ComponentFixture<ProfitLossReportComponent>;
  let profitLossReportService: jasmine.SpyObj<ProfitLossReportService>;
  let commonService: jasmine.SpyObj<CommonService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  const saleProfitLoss: ProfitLoss = { total: 500, totalTax: 50, totalDiscount: 20, paidPayment: 300, totalItem: 10 } as ProfitLoss;
  const purchaseProfitLoss: ProfitLoss = { total: 400, totalTax: 40, totalDiscount: 10, paidPayment: 250, totalItem: 8 } as ProfitLoss;

  beforeEach(() => {
    profitLossReportService = jasmine.createSpyObj<ProfitLossReportService>('ProfitLossReportService', [
      'getSaleOrderProfitLoss',
      'getPurchaseProfitLoss',
    ]);
    commonService = jasmine.createSpyObj<CommonService>('CommonService', ['getLocationsForReport']);
    commonService.getLocationsForReport.and.returnValue(of({ locations: [{ id: 'loc1', name: 'Main' } as any], selectedLocation: 'loc1' } as any));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastrService = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getValue']);
    translationService.getValue.and.returnValue('TRANSLATED');
    (translationService as any).lanDir$ = new BehaviorSubject<string>('ltr').asObservable();
    const securityService = jasmine.createSpyObj('SecurityService', ['hasClaim']);
    (securityService as any).currencyCode = 'USD';
    securityService.hasClaim.and.returnValue(true);
    profitLossReportService.getSaleOrderProfitLoss.and.returnValue(of(saleProfitLoss));
    profitLossReportService.getPurchaseProfitLoss.and.returnValue(of(purchaseProfitLoss));

    TestBed.configureTestingModule({
      imports: [ProfitLossReportComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        CurrencyPipe,
        { provide: ProfitLossReportService, useValue: profitLossReportService },
        { provide: CommonService, useValue: commonService },
        { provide: SecurityService, useValue: securityService },
        { provide: ToastrService, useValue: toastrService },
        { provide: TranslationService, useValue: translationService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });

  function create(): void {
    fixture = TestBed.createComponent(ProfitLossReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create, default the date range and fetch both sale and purchase profit loss for the selected location', () => {
    create();
    expect(component).toBeTruthy();
    expect(component.searchForm.get('fromDate')?.value).toEqual(component.FromDate);
    expect(component.searchForm.get('toDate')?.value).toEqual(component.ToDate);
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(profitLossReportService.getSaleOrderProfitLoss).toHaveBeenCalledWith(
      jasmine.objectContaining({ locationId: 'loc1', fromDate: component.FromDate, toDate: component.ToDate })
    );
    expect(profitLossReportService.getPurchaseProfitLoss).toHaveBeenCalledWith(
      jasmine.objectContaining({ locationId: 'loc1' })
    );
    expect(component.saleOrderProfitLoss).toEqual(saleProfitLoss);
    expect(component.purchaseOrderProfitLoss).toEqual(purchaseProfitLoss);
  });

  it('onSearch copies form filters and marks the form touched when invalid', () => {
    create();
    profitLossReportService.getSaleOrderProfitLoss.calls.reset();
    profitLossReportService.getPurchaseProfitLoss.calls.reset();
    component.searchForm.patchValue({
      fromDate: new Date(2026, 0, 1),
      toDate: new Date(2026, 0, 31),
      locationId: 'loc2',
    });
    component.onSearch();
    let args = profitLossReportService.getSaleOrderProfitLoss.calls.mostRecent().args[0];
    expect(args.locationId).toBe('loc2');
    expect(args.fromDate).toEqual(new Date(2026, 0, 1));
    expect(profitLossReportService.getPurchaseProfitLoss).toHaveBeenCalledWith(args);

    profitLossReportService.getSaleOrderProfitLoss.calls.reset();
    profitLossReportService.getPurchaseProfitLoss.calls.reset();
    component.searchForm.patchValue({ fromDate: new Date(2026, 1, 1), toDate: new Date(2026, 0, 1) });
    expect(component.searchForm.valid).toBeFalse();
    component.onSearch();
    expect(profitLossReportService.getSaleOrderProfitLoss).not.toHaveBeenCalled();
    expect(profitLossReportService.getPurchaseProfitLoss).not.toHaveBeenCalled();
    expect(component.searchForm.get('fromDate')?.touched).toBeTrue();
  });

  it('onClear resets the form, first location and refetches both reports', () => {
    create();
    profitLossReportService.getSaleOrderProfitLoss.calls.reset();
    profitLossReportService.getPurchaseProfitLoss.calls.reset();
    component.onClear();
    expect(component.searchForm.get('locationId')?.value).toBe('loc1');
    expect(component.searchForm.get('fromDate')?.value).toEqual(component.FromDate);
    expect(component.searchForm.get('toDate')?.value).toEqual(component.ToDate);
    expect(profitLossReportService.getSaleOrderProfitLoss).toHaveBeenCalledTimes(1);
    expect(profitLossReportService.getPurchaseProfitLoss).toHaveBeenCalledTimes(1);
  });

  it('onDownloadReport reports no data when both totals are zero', () => {
    create();
    component.saleOrderProfitLoss = { total: 0, totalTax: 0, totalDiscount: 0, paidPayment: 0, totalItem: 0 } as ProfitLoss;
    component.purchaseOrderProfitLoss = { total: 0, totalTax: 0, totalDiscount: 0, paidPayment: 0, totalItem: 0 } as ProfitLoss;
    component.onDownloadReport('pdf');
    expect(toastrService.error).toHaveBeenCalledWith('TRANSLATED');
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('onDownloadReport email path builds the purchase report and opens the send-email dialog', () => {
    create();
    component.saleOrderProfitLoss = saleProfitLoss;
    component.purchaseOrderProfitLoss = purchaseProfitLoss;
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onDownloadReport('email');
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  });

  it('onSaleDownloadReport has no data guard and opens the send-email dialog from defaults', () => {
    create();
    dialog.open.and.returnValue({ afterClosed: () => of(void 0) } as any);
    component.onSaleDownloadReport('email');
    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({
        data: jasmine.objectContaining({ name: 'TRANSLATED.pdf', contentType: 'application/pdf' }),
      })
    );
  });
});
