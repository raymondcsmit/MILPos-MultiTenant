import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { catchError } from 'rxjs/operators';
import { DashboardStaticatics } from '@core/domain-classes/dashboard-staticatics';
import { CalenderReminderDto } from '@core/domain-classes/calender-reminder';
import { BestSellingProudct } from '@core/domain-classes/bast-selling-product';
import { PurchaseOrderRecentDeliverySchedule } from '@core/domain-classes/purchase-order-recent-delivery-schedule';
import { SalesOrderRecentShipmentDate } from '@core/domain-classes/sales-order-recent-shipment-date';
import { ProductResourceParameter } from '@core/domain-classes/product-resource-parameter';
import { ProductStockAlert } from '@core/domain-classes/product-stock-alert';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getDashboardStaticatics(fromDate: Date, toDate: Date, locationId: string): Observable<DashboardStaticatics> {
    const url = `dashboard/statistics`;
    const customParams = new HttpParams()
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toISOString())
      .set('locationId', locationId ? locationId : '');
    return this.httpClient
      .get<DashboardStaticatics>(url, {
        params: customParams
      });

  }

  getReminders(month: any, year: any): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/reminders/${month}/${year}`;
    return this.httpClient
      .get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getBestSellingProducts(
    fromDate: Date,
    toDate: Date,
    locationId: string
  ): Observable<BestSellingProudct[]> {
    const url = 'dashboard/bestsellingproduct';
    const customParams = new HttpParams()
      .set('fromDate', fromDate.toISOString())
      .set('toDate', toDate.toISOString())
      .set('locationId', locationId ? locationId : '');
    return this.httpClient
      .get<BestSellingProudct[]>(url, {
        params: customParams
      }
      );

  }

  getPurchaseOrderRecentDeliverySchedule(): Observable<
    PurchaseOrderRecentDeliverySchedule[]
  > {
    const url = `purchaseOrder/recentdelivery`;
    return this.httpClient.get<PurchaseOrderRecentDeliverySchedule[]>(url);
  }

  getSalesOrderRecentShipment(): Observable<
    SalesOrderRecentShipmentDate[]
  > {
    const url = `salesOrder/recentshipment`;
    return this.httpClient.get<SalesOrderRecentShipmentDate[]>(url);
  }

  getProductStockAlerts(
    resourceParams: ProductResourceParameter
  ): Observable<HttpResponse<ProductStockAlert[]>> {
    const url = `ProductStock/stock-alert`;
    const customParams = new HttpParams()
      .set('orderBy', resourceParams.orderBy)
      .set('pageSize', resourceParams.pageSize.toString())
      .set('skip', resourceParams.skip.toString())
      .set('searchQuery', resourceParams.searchQuery)
      .set('name', resourceParams.name)
      .set('locationId', resourceParams.locationId ? resourceParams.locationId : '' );

    return this.httpClient.get<ProductStockAlert[]>(url, {
      params: customParams,
      observe: 'response',
    });
  }

  getDailyReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/dailyreminder/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getWeeklyReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/weeklyreminder/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getMonthlyReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/monthlyreminder/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getQuarterlyReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/quarterlyreminder/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getHalfYearlyReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/halfyearlyreminder/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getYearlyReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `dashboard/yearlyreminder/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  getOneTimeReminders(month : number, year: number): Observable<CalenderReminderDto[] | CommonError> {
    const url = `Dashboard/onetime/${month}/${year}`;
    return this.httpClient.get<CalenderReminderDto[]>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
