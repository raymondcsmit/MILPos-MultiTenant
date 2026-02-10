import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Tenant } from '@core/domain-classes/tenant';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TenantService {

  httpClient = inject(HttpClient);

  getAll(): Observable<Tenant[]> {
    return this.httpClient.get<Tenant[]>('Tenants');
  }

  getById(id: string): Observable<Tenant> {
    return this.httpClient.get<Tenant>(`Tenants/${id}`);
  }

  create(tenant: any): Observable<Tenant> {
    return this.httpClient.post<Tenant>('Tenants', tenant);
  }

  update(id: string, tenant: any): Observable<Tenant> {
    return this.httpClient.put<Tenant>(`Tenants/${id}`, tenant);
  }

  toggleStatus(id: string, isActive: boolean): Observable<Tenant> {
    return this.httpClient.put<Tenant>(`Tenants/${id}/status`, { isActive });
  }

  updateLicense(id: string, licenseType: string): Observable<Tenant> {
    return this.httpClient.put<Tenant>(`Tenants/${id}/license`, { licenseType });
  }

  switchTenant(id: string): Observable<any> {
    return this.httpClient.post<any>(`Tenants/${id}/switch`, {});
  }

  generateLicenseKeys(id: string): Observable<Tenant> {
    return this.httpClient.post<any>(`Tenants/${id}/license/generate`, {});
  }

  registerTenant(tenant: any): Observable<Tenant> {
    return this.httpClient.post<Tenant>('Tenants/register', tenant);
  }
}
