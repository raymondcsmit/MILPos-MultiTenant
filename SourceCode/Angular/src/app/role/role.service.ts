import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Role } from '@core/domain-classes/role';
import { UserRoles } from '@core/domain-classes/user-roles';
import { CommonError } from '@core/error-handler/common-error';
import { CommonHttpErrorService } from '@core/error-handler/common-http-error.service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(
    private httpClient: HttpClient,
    private commonHttpErrorService: CommonHttpErrorService) { }

  updateRole(role: Role): Observable<Role> {
    const url = `role/${role.id}`;
    return this.httpClient.put<Role>(url, role);
  }

  addRole(role: Role): Observable<Role> {
    const url = `role`;
    return this.httpClient.post<Role>(url, role);
  }

  deleteRole(id: string): Observable<void> {
    const url = `role/${id}`;
    return this.httpClient.delete<void>(url);

  }

  getRole(id: string): Observable<Role> {
    const url = `role/${id}`;
    return this.httpClient.get<Role>(url);
  }

  getRoleUsers(id: string): Observable<UserRoles[]> {
    const url = `roleusers/${id}`;
    return this.httpClient.get<UserRoles[]>(url);
  }

  updateRoleUsers(roleId: string, userRoles: UserRoles[]): Observable<UserRoles[]> {
    const url = `roleusers/${roleId}`;
    return this.httpClient.put<UserRoles[]>(url, { userRoles });

  }
}
