import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Role } from '@core/domain-classes/role';
import { RoleService } from './role.service';
import { Observable } from 'rxjs';

export const roleDetailResolver: ResolveFn<Role> = (route: ActivatedRouteSnapshot): Observable<Role> => {
  const roleService = inject(RoleService);

  const name = route.paramMap.get('id');
  return roleService.getRole(name ?? '') as Observable<Role>;
};
