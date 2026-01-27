import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegisterTenantDto } from '../domain-classes/register-tenant-dto';
import { Tenant } from '../domain-classes/tenant'; // Assuming Tenant exists or I might receive 'Tenant' back

@Injectable({ providedIn: 'root' })
export class TenantService {
  constructor(private http: HttpClient) { }

  registerTenant(tenant: RegisterTenantDto): Observable<any> {
    return this.http.post<any>('tenants/register', tenant);
  }
}
