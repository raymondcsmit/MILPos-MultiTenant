import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { BusinessLocation } from '@core/domain-classes/business-location';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonError } from '@core/error-handler/common-error';

@Injectable({ providedIn: 'root' })
export class BusinessLocationService {
  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService
  ) { }

  getLocations(): Observable<BusinessLocation[]> {
    const url = 'location';
    return this.httpClient
      .get<BusinessLocation[]>(url);
  }

  createLocation(
    language: BusinessLocation
  ): Observable<BusinessLocation | CommonError> {
    const url = 'location';
    return this.httpClient
      .post<BusinessLocation>(url, language)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  updateLocation(
    id: string,
    location: BusinessLocation
  ): Observable<BusinessLocation | CommonError> {
    const url = `location/${id}`;
    return this.httpClient
      .put<BusinessLocation>(url, location)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }

  deleteLocation(id: any): Observable<boolean | CommonError> {
    const url = `location/${id}`;
    return this.httpClient
      .delete<boolean>(url)
      .pipe(catchError(this.commonHttpErrorService.handleError));
  }
}
