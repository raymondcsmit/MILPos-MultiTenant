import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { UserService } from '../user/user.service';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@core/domain-classes/user';
export const RecoverPasswordResolver: ResolveFn<User | undefined> = (route: ActivatedRouteSnapshot) => {
  const userService = inject(UserService);
  const link = route?.params?.['link'] ?? '';

  if (link !== null) {
    return userService.getUserInfoFromResetToken(link) as Observable<User>;
  } else {
    return;
  }
};
