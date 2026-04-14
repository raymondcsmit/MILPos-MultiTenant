import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DailyPriceList } from '@core/domain-classes/daily-price-list';
import { UpdateDailyPriceListCommand } from '@core/domain-classes/daily-price-update';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DailyPriceService {
  constructor(private http: HttpClient) {}

  /**
   * Get daily price list for a specific date
   * @param priceDate Date to fetch prices for (defaults to today)
   * @param groupBy Group by 'Category' or 'Brand'
   * @returns Observable of DailyPriceList
   */
  getDailyPriceList(
    priceDate?: Date | string,
    groupBy: string = 'Category'
  ): Observable<DailyPriceList> {
    const url = 'DailyProductPrice/price-list';
    
    let params = new HttpParams();
    if (priceDate) {
      const dateStr = typeof priceDate === 'string' 
        ? priceDate 
        : priceDate.toISOString().split('T')[0];
      params = params.set('date', dateStr);
    }
    params = params.set('groupBy', groupBy);

    return this.http.get<DailyPriceList>(url, { params });
  }

  /**
   * Update daily prices for multiple products
   * @param command Update command with price date and product prices
   * @returns Observable of success response
   */
  updateDailyPriceList(
    command: UpdateDailyPriceListCommand
  ): Observable<any> {
    const url = 'DailyProductPrice/bulk-update';
    return this.http.post<any>(url, command);
  }

  /**
   * Get effective price for a product on a specific date
   * @param productId Product ID
   * @param priceDate Date to fetch price for (defaults to today)
   * @returns Observable of effective price
   */
  getEffectivePrice(
    productId: string,
    priceDate?: Date | string
  ): Observable<{ productId: string; effectivePrice: number; date: string }> {
    const url = `DailyProductPrice/effective-price/${productId}`;
    
    let params = new HttpParams();
    if (priceDate) {
      const dateStr = typeof priceDate === 'string' 
        ? priceDate 
        : priceDate.toISOString().split('T')[0];
      params = params.set('date', dateStr);
    }

    return this.http.get<{ productId: string; effectivePrice: number; date: string }>(
      url,
      { params }
    );
  }
}
