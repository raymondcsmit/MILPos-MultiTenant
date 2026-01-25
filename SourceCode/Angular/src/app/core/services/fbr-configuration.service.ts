import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface FBRConfiguration {
  id?: string;
  clientId: string;
  clientSecret: string;
  fbrKey: string;
  posId: string;
  branchCode: string;
  strn: string;
  apiBaseUrl: string;
  isEnabled: boolean;
  isTestMode: boolean;
  autoSubmitInvoices: boolean;
  maxRetryAttempts: number;
  retryDelaySeconds: number;
  maxRetryDelaySeconds: number;
  currentAccessToken?: string;
  tokenExpiresAt?: Date;
  lastSuccessfulSubmission?: Date;
  totalSubmissionsToday?: number;
  failedSubmissionsToday?: number;
}

export interface FBRTestConnectionResponse {
  success: boolean;
  message: string;
  tokenValid?: boolean;
  apiReachable?: boolean;
}

export interface FBRSaveResponse {
  success: boolean;
  message: string;
  configurationId?: string;
}

export interface FBRTokenResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FBRConfigurationService {
  private apiUrl = `${environment.apiUrl}fbr/configuration`;

  constructor(private http: HttpClient) {}

  /**
   * Get current FBR configuration
   */
  getConfiguration(): Observable<FBRConfiguration> {
    return this.http.get<FBRConfiguration>(this.apiUrl);
  }

  /**
   * Save FBR configuration
   */
  saveConfiguration(config: FBRConfiguration): Observable<FBRSaveResponse> {
    return this.http.post<FBRSaveResponse>(this.apiUrl, config);
  }

  /**
   * Test FBR API connection
   */
  testConnection(config: FBRConfiguration): Observable<FBRTestConnectionResponse> {
    return this.http.post<FBRTestConnectionResponse>(`${this.apiUrl}/test`, config);
  }

  /**
   * Manually refresh FBR access token
   */
  refreshToken(): Observable<FBRTokenResponse> {
    return this.http.post<FBRTokenResponse>(`${this.apiUrl}/refresh-token`, {});
  }

  /**
   * Get FBR submission statistics
   */
  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }
}
