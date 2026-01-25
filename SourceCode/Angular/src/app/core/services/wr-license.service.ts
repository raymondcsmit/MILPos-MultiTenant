import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { AuthToken } from '@core/domain-classes/user-auth';
import { User } from '@core/domain-classes/user';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class WrLicenseService {
  public keyValues = {
    authObj: 'auth_obj',
    COMPANY_PROFILE: 'company_profile',
    BEARER_TOKEN: 'access_token'
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {}

  onActivateLicense(purchaseCode: string): void {
    this.http.post<any>(`${environment.apiUrl}/wrlicense/validate`, { purchaseCode })
      .subscribe({
        next: (response) => {
          if (response.success) {
            localStorage.setItem('license_key', purchaseCode);
            // Assuming successful activation redirects to login
            this.router.navigate(['/login']);
          } else {
             console.error('License validation failed');
          }
        },
        error: (err) => {
          console.error('Error activating license', err);
        }
      });
  }

  getJWtToken(): AuthToken | null {
    const token = localStorage.getItem(this.keyValues.BEARER_TOKEN);
    if (token) {
        const decoded = this.jwtHelper.decodeToken(token);
        return decoded as AuthToken;
    }
    return null;
  }

  getBearerToken(): string | null {
    return localStorage.getItem(this.keyValues.BEARER_TOKEN);
  }

  getAuthObject(): User {
    const authJson = localStorage.getItem(this.keyValues.authObj);
    if (authJson) {
      return JSON.parse(authJson);
    }
    return {} as User;
  }

  setTokenValue(userAuth: any): void {
    if (userAuth) {
      if (userAuth.bearerToken) {
        localStorage.setItem(this.keyValues.BEARER_TOKEN, userAuth.bearerToken);
      }
      const user = userAuth.user ? userAuth.user : userAuth;
      if (user) {
        localStorage.setItem(this.keyValues.authObj, JSON.stringify(user));
      }
    }
  }

  removeToken(): void {
    localStorage.removeItem(this.keyValues.authObj);
    localStorage.removeItem(this.keyValues.BEARER_TOKEN);
  }
}
